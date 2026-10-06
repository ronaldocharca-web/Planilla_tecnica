const form = document.querySelector('#reportForm');
const fields = [...form.querySelectorAll('input, textarea, select')];
const value = name => form.elements[name]?.value.trim() || '';
const textOr = (value, text) => value || text;
const codeField = form.elements.codigoRevision;
const codeStatus = document.querySelector('#codeStatus');
const submitButton = form.querySelector('button[type="submit"]');
const counterConfig = window.REPORT_CODE_CONFIG || {};
const counterUrl = String(counterConfig.url || '').trim().replace(/\/+$/, '');
const counterKey = String(counterConfig.apiKey || '').trim();
const globalCounterConfigured = /^https:\/\/[a-z\d-]+\.supabase\.co$/i.test(counterUrl)
  && counterKey.length > 10 && !/YOUR_|TU_CLAVE|PON_AQUI/i.test(counterKey);
let isDownloading = false;
let previewRequestId = 0;

function setCodeStatus(message, state = '') {
  codeStatus.textContent = message;
  codeStatus.className = `code-status${state ? ` is-${state}` : ''}`;
}

async function requestReportNumber(functionName) {
  const year = new Date().getFullYear();
  const headers = { 'Content-Type': 'application/json', apikey: counterKey };
  if (counterKey.startsWith('eyJ')) headers.Authorization = `Bearer ${counterKey}`;
  const response = await fetch(`${counterUrl}/rest/v1/rpc/${functionName}`, {
    method: 'POST', headers, body: JSON.stringify({ p_year: year })
  });
  if (!response.ok) throw new Error(`Supabase respondió ${response.status}`);
  const sequence = Number(await response.json());
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error('Número de secuencia inválido');
  return `CT-MNT-${year}-${String(sequence).padStart(3, '0')}`;
}

async function showNextReportCode(lastDownloadedCode = '') {
  const requestId = ++previewRequestId;
  setCodeStatus('Consultando el próximo código…');
  try {
    const nextCode = await requestReportNumber('peek_report_number');
    if (requestId !== previewRequestId || isDownloading) return;
    codeField.value = nextCode;
    updatePreview();
    setCodeStatus(lastDownloadedCode
      ? `Word descargado con ${lastDownloadedCode}. Próximo código: ${nextCode}.`
      : 'Próximo código disponible. Se confirma al descargar el Word.', 'success');
  } catch (error) {
    if (requestId !== previewRequestId || isDownloading) return;
    codeField.value = lastDownloadedCode;
    updatePreview();
    setCodeStatus(lastDownloadedCode
      ? `Word descargado con ${lastDownloadedCode}. No se pudo consultar el siguiente; revisa Supabase y la conexión.`
      : 'No se pudo consultar el próximo código. Revisa Supabase y la conexión.', 'error');
  }
}

if (globalCounterConfigured) {
  codeField.readOnly = true;
  codeField.required = false;
  void showNextReportCode();
} else {
  codeField.readOnly = false;
  setCodeStatus('Contador global sin configurar; los códigos escritos manualmente podrían repetirse.', 'warning');
}

const labels = {
  tipoActivo: '1.1. Tipo Activo', procesador: '1.2. Procesador', marca: '1.3. Marca',
  modelo: '1.4. Modelo', serie: '1.5. S/N', tecnico: '1.6. Realizado por',
  almacenamiento: '1.7. Almacenamiento', ram: '1.8. Memoria RAM', usuario: '1.9. Usuario',
  ubicacion: '2.0. Ubicación', codigoInventario: '2.1. Código de Inventario', codigoRevision: '2.2. Código de revisión'
};

function currentData() {
  const data = Object.fromEntries(fields.map(field => [field.name, field.value.trim()]));
  data.ram = data.ram ? `${data.ram} GB` : '';
  data.almacenamiento = [data.tipoAlmacenamiento, data.capacidadAlmacenamiento && `${data.capacidadAlmacenamiento} ${data.unidadAlmacenamiento || 'GB'}`].filter(Boolean).join(' · ');
  return data;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[char]);
}

function updatePreview() {
  const data = currentData();
  const filled = fields.filter(field => field.value.trim()).length;
  const percent = Math.round(filled / fields.length * 100);
  document.querySelector('#progressText').textContent = `${percent}%`;
  document.querySelector('#progressBar').style.width = `${percent}%`;
  document.querySelector('#previewDate').textContent = data.fecha
    ? new Date(`${data.fecha}T12:00:00`).toLocaleDateString('es-BO')
    : 'Fecha pendiente';

  const previewRows = [
    { left: ['I.1. Tipo Activo', data.tipoActivo], right: ['1.9 Usuario', data.usuario] },
    { left: ['I.2. Procesador', data.procesador], right: ['2.0 Ubicación', data.ubicacion] },
    { left: ['I.3. Marca', data.marca], right: ['2.1 Código de Inventario', data.codigoInventario] },
    { left: ['I.4. Modelo', data.modelo], right: ['2.2 Código de revisión', data.codigoRevision] },
    { wide: ['I.5. S/N', data.serie] }, { wide: ['I.6. Realizado por', data.tecnico] },
    { wide: ['I.7. Almacenamiento', data.almacenamiento] }, { wide: ['I.8. Memoria RAM', data.ram] }
  ];
  document.querySelector('#previewGeneral').innerHTML = previewRows.map(item => item.wide
    ? `<div class="general-row wide-row"><div class="doc-label">${item.wide[0]}</div><div class="doc-value">${escapeHtml(textOr(item.wide[1], '—'))}</div></div>`
    : `<div class="general-row"><div class="doc-label">${item.left[0]}</div><div class="doc-value">${escapeHtml(textOr(item.left[1], '—'))}</div><div class="doc-label">${item.right[0]}</div><div class="doc-value">${escapeHtml(textOr(item.right[1], '—'))}</div></div>`).join('');
  ['problema', 'pruebas', 'conclusiones', 'recomendaciones'].forEach(key => {
    document.querySelector(`#preview${key[0].toUpperCase()}${key.slice(1)}`).textContent = textOr(data[key], `Completa ${key}.`);
  });
  document.querySelector('#previewObservaciones').textContent = textOr(data.observaciones, 'Completa las observaciones.');
  document.querySelector('#previewFirmaTecnico').textContent = data.firmaTecnico || 'VoBo Técnico';
  document.querySelector('#previewFirmaSupervisor').textContent = data.firmaSupervisor || 'VoBo Supervisor';
}

fields.forEach(field => field.addEventListener('input', updatePreview));
document.querySelector('#clearButton').addEventListener('click', () => {
  const reservedCode = globalCounterConfigured ? codeField.value : '';
  form.reset();
  form.elements.fecha.value = new Date().toISOString().slice(0, 10);
  if (globalCounterConfigured) codeField.value = reservedCode;
  updatePreview();
});

function xml(text) { return escapeHtml(text || '—'); }
const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
function directWordChildren(node, name) { return [...node.children].filter(child => child.namespaceURI === WORD_NS && child.localName === name); }
function replaceWordCell(cell, value) {
  const originals = directWordChildren(cell, 'p');
  const template = (originals.find(paragraph => [...paragraph.getElementsByTagNameNS(WORD_NS, 't')].some(text => text.textContent.trim())) || originals[0])?.cloneNode(true);
  if (!template) return;
  originals.forEach(paragraph => paragraph.remove());
  for (const line of String(value ?? '').replace(/\r/g, '').split('\n')) {
    const paragraph = template.cloneNode(true);
    const texts = [...paragraph.getElementsByTagNameNS(WORD_NS, 't')];
    if (texts.length) {
      texts[0].textContent = line;
      texts.slice(1).forEach(text => { text.textContent = ''; });
      if (/^\s|\s$/.test(line)) texts[0].setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
    } else {
      const run = paragraph.ownerDocument.createElementNS(WORD_NS, 'w:r');
      const text = paragraph.ownerDocument.createElementNS(WORD_NS, 'w:t');
      text.textContent = line; run.appendChild(text); paragraph.appendChild(run);
    }
    cell.appendChild(paragraph);
  }
}
function styleWordRun(run, halfPoints, bold = true) {
  let properties = directWordChildren(run, 'rPr')[0];
  if (!properties) { properties = run.ownerDocument.createElementNS(WORD_NS, 'w:rPr'); run.insertBefore(properties, run.firstChild); }
  let fonts = directWordChildren(properties, 'rFonts')[0];
  if (!fonts) { fonts = run.ownerDocument.createElementNS(WORD_NS, 'w:rFonts'); properties.insertBefore(fonts, properties.firstChild); }
  fonts.setAttributeNS(WORD_NS, 'w:ascii', 'Cambria'); fonts.setAttributeNS(WORD_NS, 'w:hAnsi', 'Cambria');
  let size = directWordChildren(properties, 'sz')[0];
  if (!size) { size = run.ownerDocument.createElementNS(WORD_NS, 'w:sz'); properties.appendChild(size); }
  size.setAttributeNS(WORD_NS, 'w:val', String(halfPoints));
  let color = directWordChildren(properties, 'color')[0];
  if (!color) { color = run.ownerDocument.createElementNS(WORD_NS, 'w:color'); properties.appendChild(color); }
  color.setAttributeNS(WORD_NS, 'w:val', '000000');
  if (bold && !directWordChildren(properties, 'b').length) properties.appendChild(run.ownerDocument.createElementNS(WORD_NS, 'w:b'));
}
function actualRows(table) { return directWordChildren(table, 'tr').map(row => directWordChildren(row, 'tc')); }
function removeAllTableBorders(tables) {
  for (const table of tables) {
    const props = directWordChildren(table, 'tblPr')[0];
    if (!props) continue;
    let borders = directWordChildren(props, 'tblBorders')[0];
    if (!borders) { borders = table.ownerDocument.createElementNS(WORD_NS, 'w:tblBorders'); props.appendChild(borders); }
    for (const side of ['top','left','bottom','right','insideH','insideV']) {
      let edge = directWordChildren(borders, side)[0];
      if (!edge) { edge = table.ownerDocument.createElementNS(WORD_NS, `w:${side}`); borders.appendChild(edge); }
      edge.setAttributeNS(WORD_NS, 'w:val', 'nil');
    }
    for (const cellBorders of [...table.getElementsByTagNameNS(WORD_NS, 'tcBorders')]) cellBorders.remove();
  }
}
function wordText(text) {
  const lines = String(text || '—').replace(/\r/g, '').split('\n');
  return lines.map(line => {
    const chunks = line.match(/.{1,72}/g) || [''];
    return chunks.map(escapeHtml).join('</w:t><w:br/><w:t>');
  }).join('</w:t><w:br/><w:t>');
}
function fieldCell(text, width, label = false, span = 1) { const fontSize = label ? 18 : 20; const shade = label ? '<w:shd w:fill="D9D9D9"/>' : ''; const gridSpan = span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''; return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${gridSpan}${shade}</w:tcPr><w:p><w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:sz w:val="${fontSize}"/>${label ? '' : '<w:b/>'}</w:rPr><w:t>${wordText(text)}</w:t></w:r></w:p></w:tc>`; }
function fieldRow(left, right) { return `<w:tr>${fieldCell(left[0], 2000, true)}${fieldCell(left[1], 2300)}${fieldCell(right[0], 1200, true)}${fieldCell(right[1], 3800)}</w:tr>`; }
function wideFieldRow(label, content) { return `<w:tr>${fieldCell(label, 2000, true)}${fieldCell(content, 7300, false, 3)}</w:tr>`; }
function row(left, right) { return fieldRow(left, right); }
function table(rows) { return `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D9E0EA"/><w:left w:val="single" w:sz="4" w:color="D9E0EA"/><w:bottom w:val="single" w:sz="4" w:color="D9E0EA"/><w:right w:val="single" w:sz="4" w:color="D9E0EA"/><w:insideH w:val="single" w:sz="4" w:color="D9E0EA"/><w:insideV w:val="single" w:sz="4" w:color="D9E0EA"/></w:tblPr>${rows.join('')}</w:tbl>`; }
function paragraph(text, bold = false, size = 20, centered = false) { return `<w:p>${centered ? '<w:pPr><w:jc w:val="center"/></w:pPr>' : ''}<w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:sz w:val="${size}"/>${bold ? '<w:b/>' : ''}</w:rPr><w:t xml:space="preserve">${wordText(text)}</w:t></w:r></w:p>`; }
function imageParagraph(relId, name, id, cx, cy) {
  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="${name}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

async function downloadWord() {
  const data = currentData();
  const response = await fetch('assets/INFORME_TECNICO_PLANTILLA.docx');
  if (!response.ok) throw new Error('No se encontró la plantilla Word');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const xmlText = await zip.file('word/document.xml').async('text');
  const documentXml = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (documentXml.querySelector('parsererror')) throw new Error('La plantilla Word no se pudo leer');
  const tables = [...documentXml.getElementsByTagNameNS(WORD_NS, 'tbl')];
  const general = actualRows(tables[0]);
  const values = [
    ['Tipo Activo', data.tipoActivo, '1.9 Usuario', data.usuario],
    ['Procesador', data.procesador, '2.0 Ubicación', data.ubicacion],
    ['Marca', data.marca, '2.1 Código de Inventario', data.codigoInventario],
    ['Modelo', data.modelo, '2.2 Código de revisión', data.codigoRevision],
    ['S/N', data.serie], ['Realizado por', data.tecnico],
    ['Almacenamiento', data.almacenamiento], ['Memoria RAM', data.ram]
  ];
  values.forEach((fields, rowIndex) => fields.forEach((text, cellIndex) => {
    if (general[rowIndex]?.[cellIndex]) replaceWordCell(general[rowIndex][cellIndex], text);
  }));
  const diagnostic = actualRows(tables[1]);
  replaceWordCell(diagnostic[0][0], 'Problema reportado');
  replaceWordCell(diagnostic[0][1], data.problema);
  replaceWordCell(diagnostic[1][0], 'Pruebas realizadas');
  replaceWordCell(diagnostic[2][0], data.pruebas);
  const results = actualRows(tables[2]);
  replaceWordCell(results[0][0], 'Conclusiones');
  replaceWordCell(results[1][0], data.conclusiones);
  replaceWordCell(results[2][0], 'Recomendaciones');
  replaceWordCell(results[3][0], data.recomendaciones);
  const observations = actualRows(tables[3]);
  replaceWordCell(observations[0][0], 'Observaciones');
  replaceWordCell(observations[1][0], data.observaciones);
  const signatures = actualRows(tables[4]);
  if (signatures[1]?.[0]) replaceWordCell(signatures[1][0], `VoBo Técnico${data.firmaTecnico ? `\n${data.firmaTecnico}` : ''}`);
  if (signatures[1]?.[1]) replaceWordCell(signatures[1][1], `VoBo Supervisor${data.firmaSupervisor ? `\n${data.firmaSupervisor}` : ''}`);
  const bodyParagraphs = [...documentXml.getElementsByTagNameNS(WORD_NS, 'p')];
  for (const paragraph of bodyParagraphs) {
    const text = [...paragraph.getElementsByTagNameNS(WORD_NS, 't')].map(node => node.textContent).join('').trim();
    if (/^Fecha\b/i.test(text)) {
      paragraph.remove();
    }
  }
  const headingMap = new Map([['Datos Generales', 'Datos Generales'], ['Diagnostico', 'Diagnóstico'], ['Diagnóstico', 'Diagnóstico'], ['Resultados', 'Resultados'], ['Observaciones', 'Observaciones']]);
  for (const paragraph of bodyParagraphs) {
    const textNode = paragraph.getElementsByTagNameNS(WORD_NS, 't')[0];
    const text = [...paragraph.getElementsByTagNameNS(WORD_NS, 't')].map(node => node.textContent).join('').trim();
    if (textNode && /^INFORME T[ÉE]CNICO$/i.test(text)) {
      textNode.textContent = 'REPORTE TÉCNICO';
      [...paragraph.getElementsByTagNameNS(WORD_NS, 't')].slice(1).forEach(node => { node.textContent = ''; });
    } else if (textNode && headingMap.has(text)) {
      textNode.textContent = headingMap.get(text);
      [...paragraph.getElementsByTagNameNS(WORD_NS, 't')].slice(1).forEach(node => { node.textContent = ''; });
      const run = textNode.parentElement;
      if (run?.namespaceURI === WORD_NS && run.localName === 'r') styleWordRun(run, 20, true);
    }
  }
  zip.file('word/document.xml', new XMLSerializer().serializeToString(documentXml));
  const headerFile = zip.file('word/header1.xml');
  if (headerFile) {
    const headerXml = new DOMParser().parseFromString(await headerFile.async('text'), 'application/xml');
    const headerParagraphs = [...headerXml.getElementsByTagNameNS(WORD_NS, 'p')];
    for (const paragraph of headerParagraphs) {
      const runs = [...paragraph.getElementsByTagNameNS(WORD_NS, 'r')];
      for (const run of runs) {
        const textNodes = [...run.getElementsByTagNameNS(WORD_NS, 't')];
        const text = textNodes.map(node => node.textContent).join('');
        if (text.includes('INFORME T')) {
          textNodes[0].textContent = 'REPORTE TÉCNICO';
          textNodes.slice(1).forEach(node => { node.textContent = ''; });
          const runProperties = directWordChildren(run, 'rPr')[0];
          if (runProperties) {
            for (const underline of [...runProperties.getElementsByTagNameNS(WORD_NS, 'u')]) underline.remove();
            styleWordRun(run, 22, true);
          }
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(text.trim())) {
          textNodes[0].textContent = data.fecha ? new Date(`${data.fecha}T12:00:00`).toLocaleDateString('es-BO') : '';
          textNodes.slice(1).forEach(node => { node.textContent = ''; });
        }
      }
    }
    zip.file('word/header1.xml', new XMLSerializer().serializeToString(headerXml));
  }
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Reporte_Tecnico_${data.codigoRevision || 'nuevo'}.docx`; link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000); showToast('Reporte Word creado desde tu plantilla');
}

function showToast(text) { const toast = document.querySelector('#toast'); toast.textContent = text; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3200); }
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (isDownloading) return;
  if (!globalCounterConfigured && !codeField.value.trim()) { showToast('Escribe un código de revisión antes de descargar.'); return; }
  previewRequestId++;
  isDownloading = true;
  submitButton.disabled = true;
  let downloadedCode = '';
  try {
    if (globalCounterConfigured) {
      setCodeStatus('Confirmando el código global…');
      codeField.value = await requestReportNumber('next_report_number');
      updatePreview();
    }
    await downloadWord();
    if (globalCounterConfigured) {
      downloadedCode = codeField.value;
      setCodeStatus(`Word descargado con ${downloadedCode}. Consultando el próximo código…`, 'success');
    }
  } catch (error) {
    if (globalCounterConfigured) {
      setCodeStatus('No se pudo completar la descarga. Revisa la conexión e inténtalo de nuevo.', 'error');
    }
    showToast('No se pudo generar el Word. Revisa la conexión y la plantilla.');
  } finally {
    isDownloading = false;
    submitButton.disabled = false;
    if (downloadedCode) void showNextReportCode(downloadedCode);
  }
});
form.elements.fecha.value = new Date().toISOString().slice(0, 10);
document.querySelector('.doc-title span').textContent = 'REPORTE TÉCNICO';
document.querySelector('.preview-header h3').textContent = 'Reporte técnico';
updatePreview();
document.querySelectorAll('.document-preview h4').forEach((heading, index) => { heading.textContent = ['I. Datos Generales', 'II. Diagnóstico', 'III. Resultados'][index] || heading.textContent; });
