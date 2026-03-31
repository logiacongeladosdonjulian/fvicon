document.addEventListener('DOMContentLoaded', () => {
    // ─── DOM References ───────────────────────────────────────────────────────
    const dropZone        = document.getElementById('drop-zone');
    const fileInput       = document.getElementById('file-input');
    const bgColorInput    = document.getElementById('bg-color');
    const colorValue      = document.getElementById('color-value');
    const colorPreviewBox = document.getElementById('color-preview-box');
    const logoScaleInput  = document.getElementById('logo-scale');
    const scaleDisplay    = document.getElementById('scale-value');
    const offsetXInput    = document.getElementById('offset-x');
    const offsetYInput    = document.getElementById('offset-y');
    const shapeInputs     = document.querySelectorAll('input[name="shape"]');
    const svgContainer    = document.getElementById('svg-container');
    const tabFavicon      = document.getElementById('tab-favicon-preview');
    const formatSelect    = document.getElementById('format-select');
    const downloadBtn     = document.getElementById('download-btn');
    const exportHint      = document.getElementById('export-hint');
    const resetBtn        = document.getElementById('reset-btn');
    const toastEl         = document.getElementById('toast');
    const sizePreviewRow  = document.getElementById('size-preview-row');
    const colorPresets    = document.getElementById('color-presets');
    const dragContentHtml = document.getElementById('drag-content-html');

    // ─── State ────────────────────────────────────────────────────────────────
    let currentLogoData = null;  // base64 data URL of uploaded image
    let logoAspectRatio = 1;
    let currentSvgCode  = '';
    let toastTimer       = null;

    // ─── i18n helper ──────────────────────────────────────────────────────────
    function t(key) {
        const lang = document.getElementById('lang-select')?.value || 'es';
        if (window._translations && window._translations[lang] && window._translations[lang][key]) {
            return window._translations[lang][key];
        }
        // Fallback to Spanish, then to key
        if (window._translations && window._translations['es'] && window._translations['es'][key]) {
            return window._translations['es'][key];
        }
        return key;
    }

    // ─── Event: Drag & Drop ───────────────────────────────────────────────────
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('active');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('active');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleFile(file);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    // ─── Event: Color ─────────────────────────────────────────────────────────
    bgColorInput.addEventListener('input', (e) => {
        colorValue.textContent      = e.target.value.toUpperCase();
        colorPreviewBox.style.background = e.target.value;
        updateColorChipActive(e.target.value);
        updatePreview();
    });

    // ─── Event: Color Presets ─────────────────────────────────────────────────
    if (colorPresets) {
        colorPresets.addEventListener('click', (e) => {
            const chip = e.target.closest('.color-chip');
            if (!chip) return;
            const color = chip.dataset.color;
            bgColorInput.value = color;
            colorValue.textContent = color.toUpperCase();
            colorPreviewBox.style.background = color;
            updateColorChipActive(color);
            updatePreview();
        });
    }

    function updateColorChipActive(color) {
        if (!colorPresets) return;
        colorPresets.querySelectorAll('.color-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.color.toLowerCase() === color.toLowerCase());
        });
    }

    // ─── Event: Scale ─────────────────────────────────────────────────────────
    logoScaleInput.addEventListener('input', (e) => {
        scaleDisplay.textContent = e.target.value;
        updatePreview();
    });

    // ─── Event: Offsets ───────────────────────────────────────────────────────
    [offsetXInput, offsetYInput].forEach(i => i.addEventListener('input', updatePreview));

    // ─── Event: Shape ─────────────────────────────────────────────────────────
    shapeInputs.forEach(i => i.addEventListener('change', updatePreview));

    // ─── Event: Format hint (i18n-aware) ──────────────────────────────────────
    formatSelect.addEventListener('change', () => {
        updateFormatHint();
    });

    function updateFormatHint() {
        const hintKeys = { ico: 'hint_ico', png: 'hint_png', svg: 'hint_svg' };
        const key = hintKeys[formatSelect.value];
        if (key) exportHint.textContent = t(key);
    }

    // ─── Event: Download ──────────────────────────────────────────────────────
    downloadBtn.addEventListener('click', () => {
        if (!currentSvgCode) return;
        const fmt = formatSelect.value;
        if      (fmt === 'svg') downloadSVG();
        else if (fmt === 'png') downloadPNG();
        else if (fmt === 'ico') downloadICO();
    });

    // ─── Event: Reset ─────────────────────────────────────────────────────────
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentLogoData = null;
            currentSvgCode  = '';
            logoAspectRatio = 1;

            // Reset controls
            bgColorInput.value = '#ffffff';
            colorValue.textContent = '#FFFFFF';
            colorPreviewBox.style.background = '#ffffff';
            logoScaleInput.value = 100;
            scaleDisplay.textContent = '100';
            offsetXInput.value = 0;
            offsetYInput.value = 0;
            document.querySelector('input[name="shape"][value="25"]').checked = true;
            formatSelect.value = 'ico';
            updateFormatHint();
            updateColorChipActive('#ffffff');

            // Reset preview
            svgContainer.innerHTML = `
                <div class="placeholder-preview">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>
                    <p data-i18n="preview_placeholder">${t('preview_placeholder')}</p>
                </div>`;

            // Reset tab favicon
            tabFavicon.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='25' fill='%23fff'/%3E%3C/svg%3E";

            // Reset drop zone
            dragContentHtml.innerHTML = `
                <div class="icon-wrapper">
                    <svg class="icon-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </div>
                <p class="drag-title" data-i18n="upload_title">${t('upload_title')}</p>
                <p class="drag-desc" data-i18n="upload_desc">${t('upload_desc')}</p>`;

            // Reset buttons
            downloadBtn.disabled = true;
            resetBtn.disabled    = true;
            fileInput.value      = '';

            // Hide size previews
            if (sizePreviewRow) sizePreviewRow.style.display = 'none';

            // Refresh i18n on newly created DOM elements
            if (window.updateI18n) window.updateI18n();
        });
    }

    // ─── Core: Load image ─────────────────────────────────────────────────────
    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                logoAspectRatio = img.width / img.height;
                currentLogoData = e.target.result; // base64 data URL
                updatePreview();
                downloadBtn.disabled = false;
                if (resetBtn) resetBtn.disabled = false;
                // Feedback visual on dropzone
                dragContentHtml.innerHTML = `
                    <div class="icon-wrapper success-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                    </div>
                    <p class="drag-title" data-i18n="uploaded_title">${t('uploaded_title')}</p>
                    <p class="drag-desc" data-i18n="uploaded_desc">${t('uploaded_desc')}</p>
                `;
                if(window.updateI18n) window.updateI18n();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ─── Core: Build & render SVG ─────────────────────────────────────────────
    function updatePreview() {
        if (!currentLogoData) return;

        const bgColor  = bgColorInput.value;
        const scale    = parseInt(logoScaleInput.value) / 100;
        const offsetX  = parseFloat(offsetXInput.value) || 0;
        const offsetY  = parseFloat(offsetYInput.value) || 0;
        const checked  = document.querySelector('input[name="shape"]:checked');
        const checkedVal = checked ? checked.value : '25';
        const isNone = checkedVal === 'none';
        const rx = isNone ? 0 : parseFloat(checkedVal);

        let w, h;
        if (logoAspectRatio >= 1) {
            w = 100 * scale;
            h = (100 / logoAspectRatio) * scale;
        } else {
            h = 100 * scale;
            w = (100 * logoAspectRatio) * scale;
        }

        const x = (100 - w) / 2 + offsetX;
        const y = (100 - h) / 2 + offsetY;

        currentSvgCode = [
            `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
            isNone ? '' : `  <rect width="100" height="100" rx="${rx}" fill="${bgColor}"/>`,
            `  <image href="${currentLogoData}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`,
            `</svg>`
        ].filter(Boolean).join('\n');

        // Render central preview
        svgContainer.innerHTML = currentSvgCode;

        // Update browser-tab favicon (encode SVG as data URL)
        const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(currentSvgCode);
        tabFavicon.src = svgDataUrl;

        // Update multi-size previews
        updateSizePreviews(svgDataUrl);
    }

    // ─── Size Previews ────────────────────────────────────────────────────────
    function updateSizePreviews(dataUrl) {
        if (!sizePreviewRow) return;
        sizePreviewRow.style.display = 'flex';
        ['16', '32', '48', '180'].forEach(size => {
            const img = document.getElementById('size-' + size);
            if (img) img.src = dataUrl;
        });
    }

    // ─── Download helpers ─────────────────────────────────────────────────────

    async function triggerDownload(blob, filename) {
        // ── Primary: File System Access API (Chrome 86+, Edge 86+) ────
        if ('showSaveFilePicker' in window) {
            try {
                const ext = filename.split('.').pop().toLowerCase();
                const mimeMap = {
                    svg: 'image/svg+xml',
                    png: 'image/png',
                    ico: 'image/x-icon'
                };
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: ext.toUpperCase() + ' Image',
                        accept: { [mimeMap[ext] || 'application/octet-stream']: ['.' + ext] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                showToast(t('toast_downloaded'));
                return;
            } catch (err) {
                if (err.name === 'AbortError') return; // User cancelled
                console.warn('showSaveFilePicker failed, using fallback:', err);
            }
        }

        // ── Fallback: classic anchor + blob URL (works on http/https) ─
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 2000);
        showToast(t('toast_downloaded'));
    }

    // ─── SVG download ─────────────────────────────────────────────────────────
    function downloadSVG() {
        const header  = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';
        const content = header + currentSvgCode;
        const blob    = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
        triggerDownload(blob, 'favicon.svg');
    }

    // ─── PNG render to canvas ─────────────────────────────────────────────────
    function renderSvgToCanvas(svgString, size) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            const ctx = canvas.getContext('2d');

            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, size, size);
                ctx.drawImage(img, 0, 0, size, size);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('canvas.toBlob returned null'));
                }, 'image/png');
            };
            img.onerror = reject;
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        });
    }

    // ─── PNG download ─────────────────────────────────────────────────────────
    async function downloadPNG() {
        setLoading(true, t('loading_png'));
        try {
            const blob = await renderSvgToCanvas(currentSvgCode, 512);
            triggerDownload(blob, 'favicon.png');
        } catch (err) {
            console.error('PNG error:', err);
            alert(t('error_png'));
        } finally {
            setLoading(false);
        }
    }

    // ─── ICO download ─────────────────────────────────────────────────────────
    async function downloadICO() {
        setLoading(true, t('loading_ico'));
        try {
            const size    = 32;
            const pngBlob = await renderSvgToCanvas(currentSvgCode, size);
            const pngBuf  = await pngBlob.arrayBuffer();
            const pngArr  = new Uint8Array(pngBuf);
            const pngLen  = pngArr.byteLength;

            const headerSize = 6;
            const dirSize    = 16;
            const dataOffset = headerSize + dirSize;

            const ico  = new ArrayBuffer(dataOffset + pngLen);
            const view = new DataView(ico);

            // ── ICONDIR (6 bytes) ──────────────────────────────────────────
            view.setUint16(0, 0,    true); // reserved
            view.setUint16(2, 1,    true); // type = 1 (icon)
            view.setUint16(4, 1,    true); // image count = 1

            // ── ICONDIRENTRY (16 bytes) ────────────────────────────────────
            view.setUint8 (6,  size === 256 ? 0 : size); // width
            view.setUint8 (7,  size === 256 ? 0 : size); // height
            view.setUint8 (8,  0);    // color count
            view.setUint8 (9,  0);    // reserved
            view.setUint16(10, 1,    true); // color planes
            view.setUint16(12, 32,   true); // bits per pixel
            view.setUint32(14, pngLen,   true); // image data size
            view.setUint32(18, dataOffset, true); // offset

            // ── PNG payload ────────────────────────────────────────────────
            new Uint8Array(ico).set(pngArr, dataOffset);

            const icoBlob = new Blob([ico], { type: 'image/x-icon' });
            triggerDownload(icoBlob, 'favicon.ico');
        } catch (err) {
            console.error('ICO error:', err);
            alert(t('error_ico'));
        } finally {
            setLoading(false);
        }
    }

    // ─── UI helpers ───────────────────────────────────────────────────────────
    function setLoading(on, label = '') {
        downloadBtn.disabled = on;
        if (on) {
            downloadBtn.querySelector('.btn-text').textContent = label;
        } else {
            downloadBtn.querySelector('.btn-text').textContent = t('btn_download');
            // Re-apply i18n to keep data-i18n attributes in sync
            if (window.updateI18n) window.updateI18n();
        }
    }

    // ─── Toast ────────────────────────────────────────────────────────────────
    function showToast(message) {
        if (!toastEl) return;
        toastEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg> ${message}`;
        toastEl.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
    }
});
