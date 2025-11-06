import { IntegrationBase } from "@budibase/types"
import fetch from "node-fetch"
import { trimUrlTrailingSlash } from "./util"

interface Query {
  method: string
  body?: string
  headers?: { [key: string]: string },
  query?: any
}


interface NocoDBApiConfig {
  isNocoDBCloud: boolean;
  host: string;
  apiToken: string;
  baseId: string;
  tableId: string;
}

class CustomIntegration implements IntegrationBase {
  private readonly config: NocoDBApiConfig

  constructor(config: NocoDBApiConfig) {
    this.config = {
      ...config,
      host: trimUrlTrailingSlash(config.host ?? 'https://app.nocodb.com')
    }
  }

  async request(url: string, opts: Query) {
    opts.headers = {
      ...(opts.headers ?? {}),
      ['xc-token']: this.config.apiToken
    };

    url = url.startsWith('/') ? url : `/${url}`;

    if(opts.query) {
      const urlSearch = new URLSearchParams(opts.query);
      url = `${url}?${urlSearch.toString()}`;
    }
    const response = await fetch(`${this.config.host}${url}`, opts);
    if (response.status <= 300) {
      try {
        const contentType = response.headers.get("content-type")
        if (contentType?.includes("json")) {
          return await response.json()
        } else {
          return await response.text()
        }
      } catch (err) {
        return await response.text()
      }
    } else {
      const err = await response.text()
      throw new Error(err)
    }
  }

  async create(query: { json: object }) {
    const opts = {
      method: "POST",
      body: JSON.stringify({ fields: query.json }),
      headers: {
        "Content-Type": "application/json",
      },
    }
    return this.request(`/api/v3/data/${this.config.baseId}/${this.config.tableId}/records`, opts)
  }

  async read(query: { fieldIdOnResult?: boolean; filter: string; pageSize: number; page: number; }) {
    const opts = {
      method: "GET",
      query: query,
    }
    return this.request(`/api/v3/data/${this.config.baseId}/${this.config.tableId}/records`, opts)
  }

  async update(query: { id: string; fields: string }) {
    const opts = {
      method: "PATCH",
      body: JSON.stringify({
        id: query.id,
        fields: JSON.parse(query.fields)
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }
    return this.request(`/api/v3/data/${this.config.baseId}/${this.config.tableId}/records`, opts)
  }

  async upsert(query: { id: string; fields: string }) {
    const opts = {
      method: query.id ? "PATCH" : "POST",
      body: JSON.stringify({
        id: query.id,
        fields: JSON.parse(query.fields)
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }
    return this.request(`/api/v3/data/${this.config.baseId}/${this.config.tableId}/records`, opts)
  }

  async delete(query: { id: string }) {
    const opts = {
      method: "DELETE",
      body: JSON.stringify({ id: query.id })
    }
    return this.request(`/api/v3/data/${this.config.baseId}/${this.config.tableId}/records`, opts)
  }
}

export default CustomIntegration
