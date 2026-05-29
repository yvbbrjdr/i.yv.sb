export default {
  async fetch(request, env, ctx): Promise<Response> {
    return new Response(
      JSON.stringify(
        {
          ip: request.headers.get("CF-Connecting-IP"),
          ...request.cf,
        },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  },
} satisfies ExportedHandler<Env>;
