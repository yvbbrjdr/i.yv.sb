import net from "node:net";

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

const fetchForIp = async (ip: string): Promise<Record<string, any> | null> => {
  return null;
};

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const resp: {
      ip: string | null;
      resolved: Record<string, any> | null;
      [key: string]: any;
    } = {
      ip: request.headers.get("CF-Connecting-IP"),
      resolved: null,
      ...request.cf,
    };

    const url = new URL(request.url);
    const path = url.pathname.substring(1);
    if (path !== "") {
      const ip = await getIpFromString(path);
      if (ip) {
        resp.resolved = await fetchForIp(ip);
      }
    }

    return new Response(JSON.stringify(resp, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  },
} satisfies ExportedHandler<Env>;
