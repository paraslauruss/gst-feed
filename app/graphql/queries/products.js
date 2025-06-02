export const GET_PRODUCT_HANDLES_QUERY = `
  query {
    products(first: 50) {
      edges {
        node {
          id
          handle
          title
        }
      }
    }
  }
`;