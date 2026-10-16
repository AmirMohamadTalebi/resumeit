(function () {
  'use strict';
  window.bindResumeProjects = function (doc) {
    if (doc.documentElement.dataset.projectsBound) return;
    doc.documentElement.dataset.projectsBound = 'true';
    doc.addEventListener('click', e => {
      const button = e.target.closest('[data-project-open]');
      if (button) {
        const dialog = doc.getElementById(button.dataset.projectOpen);
        if (dialog && !dialog.open) { dialog.showModal(); dialog.querySelector('button')?.focus(); }
      }
      const close = e.target.closest('[data-project-close]'); if (close) close.closest('dialog')?.close();
      if (e.target.tagName === 'DIALOG') { const box = e.target.getBoundingClientRect(); if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) e.target.close(); }
    });
  };
  window.bindResumeProjects(document);
})();
