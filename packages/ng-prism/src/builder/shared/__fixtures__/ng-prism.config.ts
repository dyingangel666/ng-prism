export default {
  plugins: [
    {
      name: 'test-meta-plugin',
      onComponentScanned(component: Record<string, unknown>) {
        const meta = component['meta'] as Record<string, unknown> ?? {};
        meta['tested'] = true;
        return Object.assign({}, component, { meta });
      },
    },
  ],
};
