import { useLoaderData } from "@remix-run/react";

export function CrawlStats() {
  const data = useLoaderData();

  if (data.error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h3 className="font-medium text-red-800">Last crawl failed</h3>
        <p className="text-sm text-red-600">{data.error}: {data.details}</p>
        {data.stack && (
          <pre className="mt-2 text-xs text-red-500 overflow-auto">
            {data.stack}
          </pre>
        )}
      </div>
    );
  }

  if (!data.success) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-medium text-yellow-800">Crawl status unknown</h3>
        <p className="text-sm text-yellow-600">No valid crawl data received</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="font-medium text-gray-900">Crawl Statistics</h3>
      <div className="mt-4 space-y-3">
        <div>
          <p className="text-sm text-gray-500">Last Crawl Status</p>
          <p className="text-lg font-semibold text-green-600">Successful</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Products Found</p>
          <p className="text-lg font-semibold">{data.productCount}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Last Crawl</p>
          <p className="text-sm">
            {new Date(data.lastCrawl).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}