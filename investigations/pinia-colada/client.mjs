// Narrow feasibility prototype: GET operations with required path parameters.
// Reuses Orval's Fetch transport, schema imports, and file writers.
export default function piniaColadaClient(clients) {
  const fetch = clients.fetch;
  return {
    ...fetch,
    dependencies: (...args) => [
      ...(fetch.dependencies?.(...args) ?? []),
      {
        dependency: '@pinia/colada',
        exports: [
          { name: 'useQuery', values: true },
          { name: 'defineQueryOptions', values: true },
        ],
      },
      {
        dependency: 'vue',
        exports: [
          { name: 'toValue', values: true },
          { name: 'MaybeRefOrGetter' },
        ],
      },
    ],
    async client(verb, options, outputClient, output) {
      if (
        verb.verb !== 'get' ||
        verb.mutator ||
        verb.props.some((prop) => prop.type !== 'param' || !prop.required)
      ) {
        throw new Error(
          'Colada prototype supports GET with required path parameters only',
        );
      }
      if (!options.override.fetch.forceSuccessResponse) {
        throw new Error('Colada prototype requires fetch.forceSuccessResponse');
      }
      const transport = await fetch.client(verb, options, outputClient, output);
      const name = verb.operationName;
      const title = name[0].toUpperCase() + name.slice(1);
      const parameters = verb.props.map(
        (prop, index) =>
          `${prop.name}: MaybeRefOrGetter<Parameters<typeof ${name}>[${index}]>`,
      );
      const plainParameters = verb.props.map(
        (prop, index) => `${prop.name}: Parameters<typeof ${name}>[${index}]`,
      );
      const resolved = verb.props.map((prop) => `toValue(${prop.name})`);
      const argumentsList = verb.props.map((prop) => prop.name);
      const key = [JSON.stringify(name), ...argumentsList].join(', ');
      return {
        ...transport,
        implementation: `${transport.implementation}

export function get${title}ColadaOptions(${plainParameters.join(', ')}) {
  return defineQueryOptions({
    key: [${key}],
    query: ({ signal }) => ${name}(${[...argumentsList, '{ signal }'].join(', ')}),
    staleTime: 60_000,
  });
}

export function use${title}(${parameters.join(', ')}) {
  return useQuery(() => get${title}ColadaOptions(${resolved.join(', ')}));
}
`,
      };
    },
  };
}
