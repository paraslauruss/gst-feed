import { useEffect, useState } from "react";
import { GET_PRODUCT_HANDLES_QUERY } from '../graphql/queries/products';
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Card,
  Page,
  Text,
  TextContainer,
  ResourceList,
  ResourceItem,
  Badge,
  InlineStack,
} from '@shopify/polaris';
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { json } from '@remix-run/node';
import { CrawlStats } from "../components/CrawlStats";
import CrawlReport from "./admin.crawl-report";

export const loader = async ({ request }) => {

  const { admin, session } = await authenticate.admin(request);

  if (!session || !session.shop) {
    console.error("Session or shop missing", session);
    throw new Response("Unauthorized", { status: 401 });
  }
  console.log("Session or shop missing", session);

  const data = await admin.graphql(GET_PRODUCT_HANDLES_QUERY);
  const res = await data.json();

  const shop = session.shop;
  const products = res.data.products.edges.map(edge => edge.node);
  const productUrls = products.map(p => `https://${shop}/products/${p.handle}`);

  console.log(`Crawling 1 ${productUrls.length} products for shop ${shop}`);

  if (!productUrls.length) {
    return json({
      successRate: 0,
      results: [],
      shop: shop,
      session: !session || !session.shop
    });
  }

  const results = await Promise.all(
    productUrls.map(async (url) => {
      try {
        const response = await fetch(url);
        const html = await response.text();
        const status = response.status;

        const hasOgType = /<meta\s+property=["']og:type["']\s+content=["']product["']/.test(html);
        const hasOgTitle = /<meta\s+property=["']og:title["']/.test(html);
        const hasOgImage = /<meta\s+property=["']og:image["']/.test(html);
        const hasOgPrice = /<meta\s+property=["']og:price:amount["']/.test(html);

        const hasJSONLD = /<script[^>]+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/s.test(html);
        const jsonLDBlock = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/s);

        console.log("🔍 hasOgType:", hasOgType);
        console.log("🔍 hasOgTitle:", hasOgTitle);
        console.log("🔍 hasOgImage:", hasOgImage);
        console.log("🔍 hasOgPrice:", hasOgPrice);
        console.log("🔍 hasJSONLD:", hasJSONLD);


        let hasProductJSONLD = false;

        if (jsonLDBlock && jsonLDBlock[1]) {
          try {
            const json = JSON.parse(jsonLDBlock[1]);
            if (json["@type"] === "Product" || (Array.isArray(json["@graph"]) && json["@graph"].some(x => x["@type"] === "Product"))) {
              hasProductJSONLD = true;
            }
          } catch (e) {
            console.log("⚠️ JSON-LD parsing error at", url);
          }
        }
        console.log("🔍 jsonLDBlock:", hasProductJSONLD);
        const success =
          response.ok &&
          hasOgType &&
          hasOgTitle &&
          hasOgImage &&
          hasOgPrice &&
          hasJSONLD &&
          hasProductJSONLD;

        console.log("🔍 Crawling:", url);
        console.log("📄 Status:", status);
        console.log("✅ Valid OG & JSON-LD?", success);

        if (!success) {
          console.log("❌ FAIL Preview:", html.slice(0, 500));
        }

        return { url, success };
      } catch (error) {
        console.log("🔥 Error crawling", url, error.message);
        return { url, success: false, error: error.message };
      }
    })
  );

  const successCount = results.filter(r => r.success).length;
  const total = results.length;

  return json({
    successRate: total > 0 ? (successCount / total) * 100 : 0,
    results: results || [],
    shop: shop,

  });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();
  const product = responseJson.data.productCreate.product;
  const variantId = product.variants.edges[0].node.id;
  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );
  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson.data.productCreate.product,
    variant: variantResponseJson.data.productVariantsBulkUpdate.productVariants,
  };
};

export default function Index() {
  const { successRate = 0, results = [], shop, session } = useLoaderData();
  console.log(`Session : ${shop}`);
  return (
    <Page title="Crawl Success Report">
      <Card>
        <TextContainer spacing="loose">
          <Text variant="headingMd">Crawl Success Rate</Text>
          <Text variant="bodyLg">
            {(successRate?.toFixed?.(2) || '0.00')}% of products crawled successfully
          </Text>

          <ResourceList
            resourceName={{ singular: 'product', plural: 'products' }}
            items={results}
            renderItem={(item) => {
              const { url, success, error } = item;
              return (
                <ResourceItem id={url}>
                  <InlineStack align="space-between">
                    <Text>{url}</Text>
                    {success ? (
                      <Badge tone="success">Success</Badge>
                    ) : (
                      <Badge tone="critical">Failed</Badge>
                    )}
                  </InlineStack>
                  {!success && error && (
                    <Text tone="subdued" variant="bodySm">
                      Error: {error}
                    </Text>
                  )}
                </ResourceItem>
              );
            }}
          />
        </TextContainer>
      </Card>
    </Page>
  );
}