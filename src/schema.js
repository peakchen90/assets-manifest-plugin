module.exports = {
  type: 'object',
  properties: {
    chunks: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1
      },
    },
    publicPath: {
      type: 'string',
    },
    filename: {
      type: 'string',
      minLength: 1,
      pattern: '\\.(js|json)$'
    },
    minify: {
      type: 'boolean'
    },
    globalName: {
      type: 'string',
      minLength: 1
    },
    disabled: {
      type: 'boolean'
    },
    shouldEmit: {
      type: 'boolean'
    }
  }
};
