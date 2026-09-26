# Genera las ilustraciones de fondo de cada tarjeta del mosaico: python tools/generar_ilustraciones.py
# Estilo caricatura plana. La parte superior izquierda queda libre (solo pared) para el texto.
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "img")


def piso(x0, ancho):
    lineas = "".join(f"M{x} 172v28" for x in range(x0 + 40, x0 + ancho, 57))
    return (f'<rect x="{x0}" y="172" width="{ancho}" height="28" fill="#e3c39a"/>'
            f'<path d="M{x0} 172h{ancho}" stroke="#c9a57a" stroke-width="2"/>'
            f'<path d="{lineas}M{x0} 186h{ancho}" stroke="#d2b08a" stroke-width="1"/>')


def svg(ancho, pared, cuerpo, margen=None):
    # "margen": pared y piso extra a cada lado. Las tarjetas son más anchas que altas, así el dibujo
    # llena el recuadro recortando solo pared sobrante, nunca el mueble.
    m = margen if margen is not None else (25 if ancho == 200 else 40)
    x0, w = -m, ancho + 2 * m
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} 0 {w} 200">'
            f'<rect x="{x0}" width="{w}" height="200" fill="{pared}"/>{cuerpo}{piso(x0, w)}</svg>')


ILUSTRACIONES = {
    "cocina": svg(200, "#ffe7d3", """
<rect x="118" y="30" width="70" height="44" rx="3" fill="#f7f2ea" stroke="#d9c7b0" stroke-width="2"/><path d="M153 30v44" stroke="#d9c7b0" stroke-width="2"/>
<rect x="146" y="46" width="3" height="12" rx="1.5" fill="#b0896a"/><rect x="157" y="46" width="3" height="12" rx="1.5" fill="#b0896a"/>
<path d="M74 70h40l6 16H68z" fill="#9aa7ae"/><rect x="88" y="40" width="12" height="30" fill="#b7c2c8"/>
<rect x="10" y="108" width="180" height="9" rx="2" fill="#4f5b63"/>
<rect x="14" y="117" width="172" height="52" fill="#f3a35c"/>
<g fill="#f7b877" stroke="#d98a44" stroke-width="1.5"><rect x="18" y="121" width="38" height="44" rx="2"/><rect x="60" y="121" width="38" height="20" rx="2"/><rect x="60" y="145" width="38" height="20" rx="2"/><rect x="102" y="121" width="38" height="44" rx="2"/><rect x="144" y="121" width="38" height="44" rx="2"/></g>
<g fill="#7a4a24"><rect x="50" y="128" width="3" height="12" rx="1.5"/><rect x="72" y="129" width="14" height="3" rx="1.5"/><rect x="72" y="153" width="14" height="3" rx="1.5"/><rect x="106" y="128" width="3" height="12" rx="1.5"/><rect x="175" y="128" width="3" height="12" rx="1.5"/></g>
<rect x="66" y="100" width="30" height="8" rx="2" fill="#39434a"/><circle cx="74" cy="104" r="2.5" fill="#ff7a45"/><circle cx="88" cy="104" r="2.5" fill="#ff7a45"/>
<path d="M140 108v-14h8" fill="none" stroke="#8a969c" stroke-width="3" stroke-linecap="round"/><path d="M122 104h32v4h-32z" fill="#cfd8dc"/>
<rect x="160" y="92" width="10" height="16" rx="2" fill="#e0474c"/><rect x="172" y="98" width="9" height="10" rx="2" fill="#2e9e5b"/>
<rect x="14" y="169" width="172" height="3" fill="#7a4a24"/>"""),

    "bano": svg(200, "#dcefff", """
<g stroke="#c4dcf2" stroke-width="1.2"><path d="M0 100h200M0 120h200M0 140h200M0 160h200M20 100v72M50 100v72M80 100v72M110 100v72M140 100v72M170 100v72"/></g>
<rect x="100" y="24" width="66" height="70" rx="33" fill="#f5fbff" stroke="#b98a5b" stroke-width="5"/><path d="M118 42l14-10M122 56l24-18" stroke="#cfe6f7" stroke-width="3" stroke-linecap="round"/>
<rect x="84" y="112" width="98" height="8" rx="3" fill="#ffffff" stroke="#c9d6df" stroke-width="1.5"/><path d="M108 112a25 9 0 0 0 50 0" fill="#e8f1f6"/>
<path d="M133 112v-12h7" fill="none" stroke="#90a4ae" stroke-width="3" stroke-linecap="round"/>
<rect x="88" y="120" width="90" height="46" rx="2" fill="#c98a4b"/><g fill="#dca56b" stroke="#a86d34" stroke-width="1.5"><rect x="92" y="124" width="40" height="38" rx="2"/><rect x="134" y="124" width="40" height="38" rx="2"/></g>
<g fill="#5b3616"><rect x="126" y="136" width="3" height="12" rx="1.5"/><rect x="137" y="136" width="3" height="12" rx="1.5"/></g>
<rect x="94" y="166" width="6" height="6" fill="#8b5a2b"/><rect x="166" y="166" width="6" height="6" fill="#8b5a2b"/>
<rect x="18" y="112" width="26" height="4" rx="2" fill="#90a4ae"/><rect x="22" y="116" width="18" height="34" rx="3" fill="#1e88e5"/><path d="M22 128h18" stroke="#64b5f6" stroke-width="3"/>"""),

    "puerta": svg(200, "#dff3e5", """
<rect x="94" y="30" width="80" height="142" fill="#8b5a2b"/><rect x="100" y="36" width="68" height="136" fill="#d89454"/>
<g fill="#e7ab6d" stroke="#b8763a" stroke-width="2"><rect x="108" y="44" width="52" height="50" rx="2"/><rect x="108" y="102" width="52" height="62" rx="2"/></g>
<circle cx="157" cy="104" r="4" fill="#f5c542" stroke="#a67c00" stroke-width="1.5"/><rect x="154" y="108" width="6" height="8" rx="2" fill="#f5c542"/>
<path d="M40 150c-12-20-4-38 6-46M46 150c0-22 10-34 20-40M52 150c6-16 18-22 28-22" fill="none" stroke="#2e9e5b" stroke-width="5" stroke-linecap="round"/>
<path d="M34 146h36l-5 26H39z" fill="#e0774c"/><rect x="32" y="144" width="40" height="6" rx="2" fill="#c65d34"/>"""),

    "sala": svg(200, "#ebe3fa", """
<rect x="70" y="62" width="104" height="60" rx="4" fill="#26222e"/><rect x="75" y="67" width="94" height="50" rx="2" fill="#3b3350"/>
<path d="M78 110l30-30 20 20 16-14 22 24z" fill="#7e57c2" opacity=".85"/><circle cx="150" cy="80" r="7" fill="#f5a623"/>
<rect x="116" y="122" width="12" height="10" fill="#26222e"/>
<rect x="18" y="132" width="176" height="36" rx="3" fill="#c98a4b"/><g fill="#dca56b" stroke="#a86d34" stroke-width="1.5"><rect x="22" y="136" width="52" height="28" rx="2"/><rect x="138" y="136" width="52" height="28" rx="2"/></g>
<rect x="78" y="136" width="56" height="28" fill="#8b5a2b"/><path d="M78 150h56" stroke="#c98a4b" stroke-width="3"/>
<rect x="86" y="140" width="16" height="8" rx="1" fill="#e0474c"/><rect x="108" y="154" width="20" height="8" rx="1" fill="#1e88e5"/>
<g fill="#5b3616"><rect x="44" y="148" width="10" height="3" rx="1.5"/><rect x="158" y="148" width="10" height="3" rx="1.5"/></g>
<rect x="24" y="168" width="5" height="4" fill="#5b3616"/><rect x="183" y="168" width="5" height="4" fill="#5b3616"/>
<path d="M36 132c-6-14 0-26 6-30M42 132c2-14 10-22 18-24" fill="none" stroke="#2e9e5b" stroke-width="4" stroke-linecap="round"/>"""),

    "comedor": svg(200, "#fde2e2", """
<path d="M128 0v58" stroke="#5b3616" stroke-width="2"/><path d="M110 74l6-16h24l6 16z" fill="#e0474c"/><ellipse cx="128" cy="76" rx="8" ry="3" fill="#ffe28a"/>
<rect x="60" y="116" width="120" height="8" rx="2" fill="#b8763a"/><rect x="66" y="124" width="7" height="48" fill="#8b5a2b"/><rect x="167" y="124" width="7" height="48" fill="#8b5a2b"/>
<ellipse cx="110" cy="112" rx="14" ry="4" fill="#fff" stroke="#e0b4b4"/><circle cx="142" cy="108" r="7" fill="#f5a623"/><circle cx="135" cy="111" r="5" fill="#2e9e5b"/>
<g fill="#d89454" stroke="#a86d34" stroke-width="1.5"><rect x="34" y="92" width="6" height="80"/><rect x="34" y="130" width="30" height="6"/><rect x="58" y="136" width="6" height="36"/></g>
<g fill="#d89454" stroke="#a86d34" stroke-width="1.5"><rect x="190" y="92" width="6" height="80"/><rect x="170" y="130" width="26" height="6"/></g>"""),

    "cama": svg(200, "#fbe1ee", """
<rect x="46" y="86" width="150" height="62" rx="6" fill="#b8763a"/><g fill="#c98a4b"><rect x="54" y="94" width="42" height="46" rx="3"/><rect x="100" y="94" width="42" height="46" rx="3"/><rect x="146" y="94" width="42" height="46" rx="3"/></g>
<rect x="46" y="136" width="154" height="16" rx="3" fill="#ffffff"/>
<path d="M92 128h108v30H92z" fill="#d6408e"/><path d="M92 128h108v7H92z" fill="#ef7fb6"/>
<rect x="54" y="120" width="34" height="16" rx="7" fill="#fff" stroke="#f0c6da"/>
<rect x="46" y="152" width="154" height="10" fill="#8b5a2b"/><rect x="50" y="162" width="6" height="10" fill="#5b3616"/><rect x="190" y="162" width="6" height="10" fill="#5b3616"/>
<rect x="6" y="130" width="34" height="42" rx="2" fill="#c98a4b"/><rect x="10" y="136" width="26" height="14" rx="2" fill="#dca56b"/><rect x="20" y="141" width="8" height="3" rx="1.5" fill="#5b3616"/>
<path d="M16 130l4-18h8l4 18z" fill="#f5a623"/>"""),

    # Tarjeta ancha: el closet (el mismo de la foto y del ícono) va a la derecha.
    "closet": svg(400, "#dcf3f5", """
<rect x="200" y="22" width="180" height="150" rx="3" fill="#e9a55c"/>
<g fill="#9c5a28"><rect x="207" y="29" width="50" height="26"/><rect x="265" y="29" width="50" height="26"/><rect x="323" y="29" width="50" height="26"/>
<rect x="207" y="62" width="50" height="102"/><rect x="265" y="62" width="50" height="102"/><rect x="323" y="62" width="50" height="102"/></g>
<g fill="#e9a55c"><rect x="265" y="92" width="50" height="5"/><rect x="288" y="62" width="4" height="30"/><rect x="207" y="118" width="50" height="4"/><rect x="323" y="118" width="50" height="4"/></g>
<g fill="#fff"><rect x="211" y="70" width="42" height="3" rx="1.5"/><rect x="327" y="70" width="42" height="3" rx="1.5"/><rect x="269" y="106" width="42" height="3" rx="1.5"/></g>
<g fill="#fff3de" stroke="#d58f45"><rect x="208" y="124" width="48" height="18" rx="2"/><rect x="208" y="145" width="48" height="18" rx="2"/><rect x="324" y="124" width="48" height="18" rx="2"/><rect x="324" y="145" width="48" height="18" rx="2"/></g>
<g fill="#7a3f14"><rect x="226" y="132" width="12" height="3" rx="1.5"/><rect x="226" y="153" width="12" height="3" rx="1.5"/><rect x="342" y="132" width="12" height="3" rx="1.5"/><rect x="342" y="153" width="12" height="3" rx="1.5"/></g>
<path d="M214 76h6l-1 26h-4z" fill="#1e88e5"/><path d="M224 76h7l-1 30h-5z" fill="#e0474c"/><path d="M334 76h8l-1 22h-6z" fill="#f5a623"/><path d="M278 112h7l-1 24h-5z" fill="#7e57c2"/>
<rect x="204" y="164" width="172" height="8" fill="#c7823c"/>"""),
}

for nombre, contenido in ILUSTRACIONES.items():
    with open(os.path.join(OUT, f"{nombre}.svg"), "w", encoding="utf-8") as f:
        f.write(contenido.replace("\n", ""))
print("ok:", ", ".join(ILUSTRACIONES))
