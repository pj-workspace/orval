import piniaColadaClient from './client.mjs';

export default {
  petstore: {
    input: { target: './openapi.json' },
    output: {
      target: './src/generated/pets.ts',
      schemas: './src/generated/models',
      client: piniaColadaClient,
      mode: 'split',
      httpClient: 'fetch',
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
          forceSuccessResponse: true,
        },
      },
    },
  },
};
