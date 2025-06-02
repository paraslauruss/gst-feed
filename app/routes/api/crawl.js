import { json } from "@remix-run/node";
import { authenticate } from "../../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({
        error: "Authentication failed",
        details: "Could not authenticate with Shopify"
      }, { status: 401 });
    }

    // Simplified query - adjust based on your needs
    const query = `#graphql
      query {
        products(first: 5) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `;

    const response = await admin.graphql(query);
    const data = await response.json();

    // Basic validation
    if (!data?.data?.products?.edges) {
      return json({
        error: "Invalid response format",
        details: data
      }, { status: 500 });
    }

    return json({
      success: true,
      productCount: data.data.products.edges.length,
      lastCrawl: new Date().toISOString()
    });

  } catch (error) {
    console.error("Crawl error:", error);
    return json({
      error: "Crawl failed",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    }, { status: 500 });
  }
};