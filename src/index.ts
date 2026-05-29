import net from "node:net";

import IPLocate from "node-iplocate";

interface Env {
  IPLOCATE_API_KEY: string;
}

interface DnsQuestion {
  name: string;
  type: number;
}

interface DnsAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DnsResult {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question: DnsQuestion[];
  Answer?: DnsAnswer[];
}

const resolveDns = async (
  hostname: string,
  type: string,
): Promise<Array<DnsAnswer> | null> => {
  const results = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${hostname}&type=${type}`,
    { headers: { Accept: "application/dns-json" } },
  );

  if (!results.ok) {
    return null;
  }

  const json = (await results.json()) as DnsResult;
  if (json.Status !== 0 || !json.Answer) {
    return null;
  }
  return json.Answer;
};

const getIpFromString = async (s: string): Promise<string | null> => {
  if (net.isIP(s)) {
    return s;
  }

  const v6 = await resolveDns(s, "AAAA");
  if (v6 && v6.length > 0) {
    return v6[0].data;
  }

  const v4 = await resolveDns(s, "A");
  if (v4 && v4.length > 0) {
    return v4[0].data;
  }

  return null;
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const iplocateClient = new IPLocate(env.IPLOCATE_API_KEY);

    const selfIp = request.headers.get("CF-Connecting-IP") as string;
    const resp: { [key: string]: any } = {
      ip: selfIp,
      resolved: null,
      cf: request.cf ?? null,
      iplocate: await iplocateClient.lookup(selfIp),
    };

    const url = new URL(request.url);
    const path = url.pathname.substring(1);
    if (path !== "") {
      const ip = await getIpFromString(path);
      if (ip) {
        resp.resolved = {
          ip,
          iplocate: await iplocateClient.lookup(ip),
        };
      }
    }

    return new Response(JSON.stringify(resp, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  },
} satisfies ExportedHandler<Env>;
