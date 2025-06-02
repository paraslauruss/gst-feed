import {
  Box,
  Card,
  Layout,
  List,
  Page,
  Text,
  BlockStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { json } from '@remix-run/node';
import { useFetcher, useLoaderData } from "@remix-run/react";
import { flattenConnection } from '@shopify/hydrogen';

export const meta = () => {
  return [{ title: 'Dashboard: Out of Stock Products' }];
};

const BULK_PRODUCT_VARIANTS_QUERY = `
  query {
    products(query: "status:ACTIVE AND published_status:PUBLISHED") {
      edges {
        node {
          id
          variants {
            edges {
              node {
                id
                inventoryQuantity
              }
            }
          }
        }
      }
    }
  }
`;

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const shopifyAdmin = admin;

  try {
    // Step 1: Check if a bulk operation is already running or recently completed
    const currentOpResponse = await shopifyAdmin.graphql(`
      {
        currentBulkOperation {
          id
          status
          url
          errorCode
        }
      }
    `);
    const currentOpData = await currentOpResponse.json();
    const currentOp = currentOpData.data.currentBulkOperation;

    if (currentOp?.status === 'CREATED' || currentOp?.status === 'RUNNING') {
      return json({ success: false, syncing: true, message: "Inventory sync in progress. Please refresh after a few seconds." });
    }

    let downloadUrl = null;

    // Step 2: If previous completed, reuse its URL
    if (currentOp?.status === 'COMPLETED' && currentOp?.url) {
      downloadUrl = currentOp.url;
    } else {
      // Step 3: Start a new bulk operation
      const bulkOperationRunQueryResponse = await shopifyAdmin.graphql(`
        mutation {
          bulkOperationRunQuery(
            query: """
            ${BULK_PRODUCT_VARIANTS_QUERY}
            """
          ) {
            bulkOperation {
              id
              status
            }
            userErrors {
              field
              message
            }
          }
        }
      `);

      const runData = await bulkOperationRunQueryResponse.json();

      if (runData.errors || runData.data.bulkOperationRunQuery.userErrors.length > 0) {
        return json({ success: false, error: 'Failed to initiate bulk operation' });
      }

      // Return early and tell UI to wait
      return json({ success: false, syncing: true, message: "Inventory sync started. Please refresh shortly." });
    }

    // Step 4: Fetch and parse result from URL
    const response = await fetch(downloadUrl);
    const text = await response.text();

    const lines = text.split('\n').filter(line => line.trim() !== '');
    const parsedLines = lines.map(line => JSON.parse(line));

    const productIds = parsedLines
      .filter(item => item.id?.includes('/Product/'))
      .map(product => product.id);

    const variants = parsedLines.filter(item => typeof item.inventoryQuantity === 'number');
    const outOfStockCount = variants.filter(v => v.inventoryQuantity === 0).length;
    const inStockCount = variants.filter(v => v.inventoryQuantity > 0).length;

    return json({
      success: true,
      productIds,
      outOfStockCount,
      inStockCount,
      totalVariants: variants.length
    });

  } catch (error) {
    return json({ success: false, error: error.message });
  }
};

export default function AdditionalPage() {
  const {
    success,
    productIds,
    outOfStockCount,
    inStockCount,
    totalVariants
  } = useLoaderData();

  return (
    <Page title="Inventory Dashboard">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="4">
              <Text variant="headingMd">Inventory Summary</Text>
              <Text>Total Variants: {totalVariants}</Text>
              <Text>🟢 In Stock: {inStockCount}</Text>
              <Text>🔴 Out of Stock: {outOfStockCount}</Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
