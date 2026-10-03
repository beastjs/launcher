/** Keep root paint and transforms when inlining an SVG in another SVG. */
export function svgSymbol(svg: string): { symbol: string; viewBox: string } {
  const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement
  if (root.localName !== 'svg' || root.querySelector('parsererror')) throw new Error('Enter a complete, valid SVG.')
  const group = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g')
  for (const attribute of Array.from(root.attributes)) {
    if (!['xmlns', 'viewBox', 'width', 'height', 'version', 'preserveAspectRatio'].includes(attribute.name)) group.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value)
  }
  for (const child of Array.from(root.childNodes)) group.appendChild(child.cloneNode(true))
  return { symbol: new XMLSerializer().serializeToString(group), viewBox: root.getAttribute('viewBox') ?? '0 0 24 24' }
}
