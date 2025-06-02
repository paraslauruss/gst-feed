import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { GET_PRODUCT_HANDLES_QUERY } from '../graphql/queries/products';
import { useLoaderData } from '@remix-run/react';
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
        productUrls.map(async url => {
            try {
                const response = await fetch(url);
                const html = await response.text();
                const success = response.ok && html.includes('<title>');
                return { url, success };
            } catch (error) {
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

export default function CrawlReport() {
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