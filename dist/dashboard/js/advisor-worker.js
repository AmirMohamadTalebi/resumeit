'use strict';
importScripts('advisor-core.js' + self.location.search);
let generation = 0;
self.onmessage = async ({ data }) => {
  const current = ++generation;
  if (data.type === 'cancel') return;
  if (data.type !== 'analyze') return;
  try {
    const result = await ResumeAdvisor.analyze(data.input, () => current !== generation);
    if (result && current === generation) self.postMessage({ type: 'result', token: data.token, result });
  } catch { if (current === generation) self.postMessage({ type: 'error', token: data.token }); }
};
