// Appearance Studio V7. All text inserted into markup is escaped.
const E = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const THEME_LABELS = {
 pistachio:'Pistachio Cream', berry:'Berry Yogurt', blueberry:'Blueberry Milk',
 peach:'Peach Blossom',matcha:'Matcha Latte',coffee:'Coffee Cream',neutral:'Neutral',
 strawberry:'Strawberry',mint:'Mint Chocolate',lavender:'Lavender Cloud'
};
export const FONT_OPTIONS = [
 ['system','System · fast'],['mali','Mali · handwriting'],['prompt','Prompt · clean'],
 ['kanit','Kanit · modern'],['sarabun','Sarabun · editorial'],['mitr','Mitr · soft'],
 ['itim','Itim · playful'],['pridi','Pridi · serif'],['serif','Georgia · serif']
];
export const FONT_FAMILIES = {system:'system-ui,-apple-system,"Segoe UI",sans-serif',mali:'"Mali",system-ui,sans-serif',prompt:'"Prompt",system-ui,sans-serif',kanit:'"Kanit",system-ui,sans-serif',sarabun:'"Sarabun",system-ui,sans-serif',mitr:'"Mitr",system-ui,sans-serif',itim:'"Itim",system-ui,sans-serif',pridi:'"Pridi",Georgia,serif',serif:'Georgia,"Times New Roman",serif'};
const label = (th,en,lang) => lang==='th'?th:en;
const option = (value,title,selected) => `<option value="${E(value)}" ${value===selected?'selected':''}>${E(title)}</option>`;
const mini = (labelText,id,value,min,max,step=1)=>`<label class="studio-control"><span>${E(labelText)} <b data-output="${E(id)}">${E(value)}</b></span><input type="range" id="${E(id)}" min="${min}" max="${max}" step="${step}" value="${E(value)}" data-live-appearance></label>`;
export function renderAppearancePanel({ui,palettes,templates,stickers,sharedNote,cloudEnabled,isOwner}) {
 const th=ui.lang==='th', T=(a,b)=>label(a,b,ui.lang), colors=ui.custom||palettes[ui.palette]||palettes.pistachio;
 const swatch = c => `<i style="background:${/^#[\da-f]{6}$/i.test(c)?c:'#cccccc'}"></i>`;
 const panelClass='studio-panel';
 return `<section class="panel ${panelClass}" id="appearance-studio">
 <div class="studio-heading"><div><div class="studio-eyebrow">✦ APPEARANCE STUDIO</div><h2>${T('ออกแบบพื้นที่ทำงาน','Design your workspace')}</h2><p class="muted">${T('ปรับแต่งสไตล์ได้ทันที · บันทึกเป็นธีมส่วนตัวและแชร์แม่แบบกับทีม','Live customization · save personal styles and shared team templates')}</p></div><span class="studio-tag">V7</span></div>
 <div class="studio-columns"><div class="studio-editor">
 <div class="studio-group"><div class="studio-group-title"><h3>${T('แม่แบบสี','Palette templates')}</h3><small>${T('แตะเพื่อทดลองทันที','Tap to preview instantly')}</small></div>
 <div class="palette-grid studio-presets">${Object.entries(palettes).map(([key,colors])=>`<button type="button" class="palette-choice ${ui.palette===key&&!ui.custom?'selected':''}" data-palette="${E(key)}"><span class="swatches">${colors.slice(0,6).map(swatch).join('')}</span><span>${E(THEME_LABELS[key]||key)}</span>${ui.palette===key&&!ui.custom?'<span class="palette-check">✓</span>':''}</button>`).join('')}</div></div>
 <div class="studio-group"><div class="studio-group-title"><h3>${T('สีที่กำหนดเอง','Custom palette')}</h3><small>${T('ใช้ได้กับหน้าต่าง ตาราง และปุ่มทั้งหมด','Applied to windows, tables, and buttons')}</small></div>
 <div class="color-grid studio-color-grid">${['Primary','Sidebar','Page','Cards','Text','Accent'].map((s,i)=>`<label class="color-setting"><span>${E(s)}</span><input aria-label="${E(s)}" type="color" data-live-appearance id="ui-color-${i}" value="${E(colors[i]||colors[0])}"><small>${E(colors[i]||colors[0])}</small></label>`).join('')}</div>
 <div class="studio-inline"><input id="theme-name" type="text" placeholder="${T('ชื่อธีมใหม่ เช่น Mint Morning','New theme name, e.g. Mint Morning')}" maxlength="48"><button type="button" class="btn" data-action="save-theme">${T('บันทึกธีม','Save template')}</button></div>
 <div class="studio-group-title"><h3>${T('แม่แบบที่บันทึกไว้','Saved templates')}</h3><small>${cloudEnabled?T('แชร์กับทีมผ่าน Supabase','Synced through Supabase'):T('บันทึกบนอุปกรณ์ · ติดตั้ง SQL เพื่อซิงก์','Saved locally · run SQL to enable sync')}</small></div>
 <div class="saved-themes">${templates.length?templates.map(t=>`<div class="saved-theme"><button type="button" class="theme-load" data-theme-load="${E(t.id)}"><span class="swatches">${(t.config?.colors||[]).slice(0,5).map(swatch).join('')}</span><strong>${E(t.name)}</strong></button><button type="button" data-theme-rename="${E(t.id)}" class="small-icon" title="Rename">✎</button><button type="button" data-theme-delete="${E(t.id)}" class="small-icon" title="Delete">×</button></div>`).join(''):`<p class="muted studio-empty">${T('ยังไม่มีธีมที่บันทึกไว้','No saved templates yet')}</p>`}</div>
 <div class="studio-inline studio-tools"><button class="btn secondary" data-action="export-appearance">${T('ส่งออกการตั้งค่า','Export styles')}</button><label class="btn secondary file-action">${T('นำเข้าธีม','Import themes')}<input type="file" accept="application/json,.json" id="import-appearance" hidden></label></div>
 </div>
 <div class="studio-group"><div class="studio-group-title"><h3>${T('ตัวอักษรและระยะห่าง','Typography & layout')}</h3></div><div class="studio-settings-grid">
 <label class="studio-control"><span>${T('ฟอนต์','Font family')}</span><select data-live-appearance id="ui-font">${FONT_OPTIONS.map(([v,n])=>option(v,n,ui.font)).join('')}</select></label>
 <label class="studio-control"><span>${T('ภาษา','Language')}</span><select data-live-appearance id="ui-lang">${option('en','English',ui.lang)}${option('th','ไทย',ui.lang)}</select></label>
 <label class="studio-control"><span>${T('โหมด','Color mode')}</span><select data-live-appearance id="ui-mode">${option('light',T('สว่าง','Light'),ui.mode)}${option('dark',T('มืด','Dark'),ui.mode)}${option('auto',T('ตามระบบ','System'),ui.mode)}</select></label>
 <label class="studio-control"><span>${T('ความหนาแน่น','Density')}</span><select data-live-appearance id="ui-density">${option('comfortable',T('สบายตา','Comfortable'),ui.density)}${option('compact',T('กระชับ','Compact'),ui.density)}</select></label>
 ${mini(T('ขนาดอักษร','Text size')+' (%)','ui-scale',ui.scale,85,125,5)}
 ${mini(T('ความโค้ง','Corner radius')+' (px)','ui-radius',ui.radius,8,28,2)}
 ${mini(T('ความเข้มเงา','Shadow strength')+' (%)','ui-shadow',ui.shadow,0,100,10)}
 ${mini(T('ความเร็วแอนิเมชัน','Animation speed')+' (%)','ui-motion',ui.motion,0,150,25)}
 </div></div>
 <div class="studio-group"><div class="studio-group-title"><h3>${T('สติ๊กเกอร์ลอย','Floating decorations')}</h3><small>${T('ลากสติ๊กเกอร์เพื่อเปลี่ยนตำแหน่งบนหน้าจอ','Drag stickers anywhere on screen')}</small></div>
 <div class="studio-toggles"><label><input type="checkbox" data-live-appearance id="decor-visible" ${ui.decor.visible?'checked':''}> ${T('แสดงภาพลอย','Show floating images')}</label><label><input type="checkbox" data-live-appearance id="decor-rotate" ${ui.decor.rotate?'checked':''}> ${T('สลับภาพตามลำดับ','Rotate sequentially')}</label><label><input type="checkbox" data-live-appearance id="decor-note" ${ui.decor.showNote?'checked':''}> ${T('แสดงโน้ตที่แชร์','Show shared note')}</label><label><input type="checkbox" data-live-appearance id="decor-arrange" ${ui.decor.arrange?'checked':''}> ${T('โหมดลากสติ๊กเกอร์','Arrange / drag mode')}</label></div>
 <div class="studio-settings-grid">${mini(T('ขนาดภาพ','Sticker size')+' (px)','decor-size',ui.decor.size,48,160,8)}${mini(T('ความโปร่งใส','Opacity')+' (%)','decor-opacity',ui.decor.opacity,30,100,10)}${mini(T('เวลาสลับ','Rotation interval')+' (s)','decor-interval',ui.decor.interval,4,60,2)}</div>
 <div class="sticker-gallery">${stickers.map(s=>`<div class="sticker-card"><div class="sticker-art">${s.image?`<img src="${E(s.image)}" alt="${E(s.name)}" loading="lazy">`:`<span>${E(s.emoji||'🥣')}</span>`}</div><strong>${E(s.name)}</strong><label class="small-switch"><input type="checkbox" data-sticker-toggle="${E(s.id)}" ${!ui.decor.hidden.includes(s.id)?'checked':''}> ${T('เปิด','On')}</label>${s.cloud&&isOwner?`<button type="button" data-sticker-delete="${E(s.id)}" class="small-icon" title="Delete image">×</button>`:''}</div>`).join('')}</div>
 ${isOwner?`<label class="sticker-uploader"><span>＋ ${T('อัปโหลดภาพ PNG, JPG, WebP หรือ GIF','Upload PNG, JPG, WebP, or GIF')}</span><input type="file" id="sticker-upload" accept="image/png,image/jpeg,image/webp,image/gif" hidden><small>${T('ขนาดไม่เกิน 2 MB · ใช้พื้นที่จัดเก็บ Supabase','Max 2 MB · uses Supabase Storage')}</small></label>`:`<p class="muted studio-help">${T('เฉพาะเจ้าของร้านเท่านั้นที่อัปโหลดภาพที่แชร์ได้','Only the store owner can upload shared images')}</p>`}
 <div class="studio-group-title"><h3>${T('ข้อความร่วมกัน','Shared message')}</h3><small>${T('ทุกคนในทีมเห็นโน้ตล่าสุด','Visible to signed-in staff')}</small></div><div class="studio-inline"><input type="text" maxlength="160" id="shared-note-text" value="${E(sharedNote||'')}" placeholder="${T('บันทึกข้อความสั้น ๆ','Leave a short note...')}"><button type="button" class="btn secondary" data-action="save-shared-note">${T('บันทึกโน้ต','Save note')}</button></div>
 <p class="muted studio-help">${T('ภาพที่อัปโหลดจะแชร์กับทีม ส่วนตำแหน่งและการมองเห็นเป็นการตั้งค่าส่วนตัว','Uploaded images are shared with staff; placement and visibility are personal preferences.')}</p>
 </div>
 <div class="studio-footer"><button type="button" class="btn" data-action="save-appearance">${T('บันทึกการตั้งค่าของฉัน','Save my appearance')}</button><button type="button" class="btn secondary" data-action="reset-appearance">${T('กลับไปใช้ค่าเริ่มต้น','Reset to default')}</button><span class="muted">${T('ตัวอย่างจะเปลี่ยนทันที ข้อมูลธุรกิจไม่เปลี่ยน','Live previews don’t affect business records')}</span></div>
 </div>
 <aside class="studio-preview-col"><div class="studio-preview-sticky"><div class="studio-group-title"><h3>${T('ตัวอย่างแบบสด','Live preview')}</h3><small>${T('แสดงชุดสีและฟอนต์ปัจจุบัน','Uses your current colors and font')}</small></div>
 <div class="studio-preview"><div class="preview-sidebar"><img src="/mascot-transparent.png" alt=""><i></i><i></i><i></i></div><div class="preview-main"><div class="preview-title">${T('ภาพรวมร้าน','Store overview')}</div><div class="preview-stat"><small>${T('ยอดขายวันนี้','Today’s sales')}</small><strong>฿1,250</strong><span>↗ 12%</span></div><div class="preview-row"><i></i><i></i><i></i></div><button type="button" class="preview-button">${T('สร้างคำสั่งซื้อ','New order')}</button></div></div>
 <div class="studio-tip">✦ ${T('สีพื้นหลัง หน้าต่างแบบป๊อปอัป และการนำทางทั้งหมดจะอ้างอิงธีมนี้','Backgrounds, dialogs, buttons, and navigation follow this theme.')}</div>
 <div class="studio-tip">${T('ฟอนต์ Google ต้องเชื่อมต่ออินเทอร์เน็ตครั้งแรกเพื่อโหลด และจะมีฟอนต์ระบบสำรอง','Google Fonts need an initial internet connection and have system fallbacks.')}</div>
 </div></aside></div></section>`;
}
