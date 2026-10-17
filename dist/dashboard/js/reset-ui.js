(function () {
  'use strict';const RI=window.RI;
  RI.delegate(document,'click','[data-reset-page]',(event,button)=>{
    const kind=button.dataset.resetPage,owner=RI.ownerId,slot=RI.workspaceSlot;let challenge,busy=false;
    const active=()=>!modal.closed&&RI.ownerId===owner&&RI.workspaceSlot===slot;
    const title=kind==='resume'?'پاک‌کردن محتوای رزومه':'بازنشانی صفحهٔ لینک‌ها';
    const modal=RI.modal({title,body:'<p>این کار فقط صفحهٔ انتخاب‌شده در همین جایگاه را پاک می‌کند و آن را از انتشار برمی‌دارد. آدرس، موجودی و خریدها حفظ می‌شوند. این پاک‌سازی واگرد ندارد.</p><p>برای ادامه، کد به شمارهٔ تأییدشدهٔ حسابت ارسال می‌شود.</p><p role="status" id="reset-status"></p>',actions:[{label:'انصراف',kind:'ghost'},{label:'دریافت کد تأیید',kind:'danger',keepOpen:true,onClick:async(api,e,b)=>{
      if(busy)return;if(!active()){modal.close();return;}busy=true;b.disabled=true;
      try{
        if(!challenge){if(RI.state.ui.dirty&&!await RI.save())return;if(!active())return;challenge=await RI.dashboardRequest('reset/request',{kind});if(!active())return;api.body.insertAdjacentHTML('beforeend','<div class="field"><label class="field__label" for="reset-code">کد پیامکی</label><input class="input" id="reset-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" dir="ltr"></div>');b.textContent=title+' با تأیید کد';api.body.querySelector('#reset-code').focus();api.body.querySelector('#reset-status').textContent='کد تا دو دقیقه معتبر است.';return;}
        const code=api.body.querySelector('#reset-code').value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
        if(!/^\d{6}$/.test(code))throw new Error('کد شش‌رقمی را وارد کن');
        const doc=await RI.dashboardRequest('reset',{kind,revision:RI.revision,challengeId:challenge.challengeId,code});
        if(!active())return;
        RI.advisorClear?.();RI.state.content=doc.content;RI.state.pub=doc.pub;RI.revision=doc.revision;RI.saved=JSON.stringify(doc.content);RI.state.ui.dirty=false;RI.resetEdits();RI.clearDraft();modal.close();RI.rerender();RI.toast('صفحه بازنشانی شد و از انتشار خارج شد');
      }catch(error){if(active())api.body.querySelector('#reset-status').textContent=error.message;}finally{busy=false;b.disabled=false;}
    }}]});
  });
})();
