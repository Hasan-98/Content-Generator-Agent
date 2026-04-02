import client from './client';

export interface ShopifyConfigResponse {
  id: string;
  shopDomain: string;
  blogId: string;
  accessTokenSet: boolean;
  topLevelId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopifyTestResult {
  success: boolean;
  shopName?: string;
  shopDomain?: string;
  error?: string;
}

export async function getShopifyConfig(topLevelId: string): Promise<ShopifyConfigResponse | null> {
  const res = await client.get(`/shopify-config/${topLevelId}`);
  return res.data;
}

export async function upsertShopifyConfig(topLevelId: string, data: {
  shopDomain: string;
  accessToken?: string;
  blogId?: string;
}): Promise<ShopifyConfigResponse> {
  const res = await client.put(`/shopify-config/${topLevelId}`, data);
  return res.data;
}

export async function deleteShopifyConfig(topLevelId: string): Promise<{ success: boolean }> {
  const res = await client.delete(`/shopify-config/${topLevelId}`);
  return res.data;
}

export async function testShopifyConnection(topLevelId: string): Promise<ShopifyTestResult> {
  const res = await client.post(`/shopify-config/${topLevelId}/test`);
  return res.data;
}
