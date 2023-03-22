const htmlPolicy = window.trustedTypes ? window.trustedTypes.createPolicy('bella-html', {
  createHTML: (string) => string,
}) : {
  createHTML: (string) => string,
}

export {
  htmlPolicy
}
