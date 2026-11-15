import type { ButtonPreset, ElementStyle, ProjectDoc } from './studio-types';

export const BUTTON_PRESETS: ButtonPreset[] = [
  {id:'cobalto',title:'Cobalto',group:'Modernos',background:'#2459f5',color:'#ffffff',radius:12,shadow:'suave'},
  {id:'medianoche',title:'Medianoche',group:'Modernos',background:'#101b35',color:'#ffffff',radius:10,shadow:'fuerte'},
  {id:'ocean',title:'Degradado Ocean',group:'Modernos',background:'linear-gradient(125deg,#1b53f6,#1ba6da)',color:'#ffffff',radius:13,shadow:'suave'},
  {id:'aurora',title:'Aurora',group:'Modernos',background:'linear-gradient(120deg,#15d1ae,#2376dc)',color:'#081e39',radius:14,shadow:'suave'},
  {id:'azulsuave',title:'Azul suave',group:'Modernos',background:'#eaf1ff',color:'#2343a4',radius:12},
  {id:'contornooscuro',title:'Contorno oscuro',group:'Minimalistas',background:'transparent',color:'#e8ebf2',radius:10,border:'#8c939e'},
  {id:'contornoazul',title:'Contorno azul',group:'Minimalistas',background:'transparent',color:'#93abff',radius:12,border:'#7795ff'},
  {id:'ghost',title:'Invisible / Ghost',group:'Minimalistas',background:'transparent',color:'#dfe7f8',radius:8},
  {id:'subrayado',title:'Texto subrayado',group:'Minimalistas',background:'transparent',color:'#93abff',radius:0},
  {id:'pildora',title:'Píldora',group:'Minimalistas',background:'#2459f5',color:'#ffffff',radius:999,shadow:'suave'},
  {id:'lujo',title:'Lujo dorado',group:'Elegantes',background:'#171a23',color:'#efce87',radius:3,border:'#b08a43',shadow:'suave'},
  {id:'marfil',title:'Marfil',group:'Elegantes',background:'#fff7e8',color:'#3e3025',radius:5,border:'#dbcab1'},
  {id:'editorial',title:'Editorial',group:'Elegantes',background:'#1d1c21',color:'#ffffff',radius:0},
  {id:'cristal',title:'Cristal',group:'Elegantes',background:'rgba(255,255,255,.85)',color:'#17223c',radius:16,border:'#b9c6db',shadow:'suave'},
  {id:'coral',title:'Coral',group:'Llamativos',background:'#ff506c',color:'#ffffff',radius:14,shadow:'fuerte'},
  {id:'solar',title:'Solar',group:'Llamativos',background:'#ffda45',color:'#162035',radius:16},
  {id:'neon',title:'Neón',group:'Llamativos',background:'#0b1230',color:'#5df4dc',radius:12,border:'#24ccb6',shadow:'fuerte'},
  {id:'brutalista',title:'Brutalista',group:'Llamativos',background:'#fdd84a',color:'#0e1424',radius:0,border:'#0e1424',shadow:'fuerte'},
  {id:'whatsapp',title:'WhatsApp',group:'Social',background:'#25d366',color:'#073d20',radius:999,shadow:'suave'},
  {id:'contacto',title:'Contacto directo',group:'Social',background:'#134e6f',color:'#ffffff',radius:999,shadow:'suave'},
  {id:'blanco',title:'Blanco limpio',group:'Social',background:'#ffffff',color:'#182336',radius:12,border:'#dce1ea'},
];

const base = (patch: Partial<ElementStyle> = {}): ElementStyle => ({
  x: 0, y: 0, fontSize: 16, fontWeight: 400, fontFamily: 'Arial, sans-serif', shadow: 'ninguna', color: '#f5f7f6', background: 'transparent',
  radius: 0, paddingX: 0, paddingY: 0, width: 'auto', ...patch,
});

export const DEMO_PROJECT: ProjectDoc = {
  id: 'entrena-t-parquesol',
  name: 'Entrena-T Parquesol',
  slug: 'entrena-t-parquesol',
  version: 3,
  lastEdited: '15 nov 2026, 08:07',
  sections: [
    { id: 'cabecera', label: 'Cabecera', children: [] },
    { id: 'inicio', label: 'Inicio', children: ['titulo', 'subtitulo', 'descripcion', 'cta', 'secundario'] },
    { id: 'servicios', label: 'Servicios', children: [] },
    { id: 'planes', label: 'Planes', children: [] },
    { id: 'metodo', label: 'Método', children: [] },
    { id: 'testimonios', label: 'Testimonios', children: [] },
    { id: 'preguntas', label: 'Preguntas frecuentes', children: [] },
    { id: 'contacto', label: 'Contacto', children: [] },
  ],
  elements: {
    titulo: {
      id: 'titulo', label: 'Título principal', kind: 'titulo', sectionId: 'inicio', text: 'ENTRENAMIENTO PERSONAL',
      style: base({ fontSize: 53, fontWeight: 700, color: '#ffffff' }),
    },
    subtitulo: {
      id: 'subtitulo', label: 'Título destacado', kind: 'subtitulo', sectionId: 'inicio', text: 'QUE SE ADAPTA A TI',
      style: base({ fontSize: 53, fontWeight: 600, color: '#b3ee06' }),
    },
    descripcion: {
      id: 'descripcion', label: 'Descripción principal', kind: 'parrafo', sectionId: 'inicio',
      text: 'En Entrena-T Parquesol combinamos atención individualizada, seguimiento constante y trato cercano para que entrenar se convierta en una experiencia segura, motivadora y efectiva. No es una obligación, es tu momento.',
      style: base({ fontSize: 17, fontWeight: 400, fontFamily: 'Arial, sans-serif', shadow: 'ninguna', color: '#e7e9e7' }),
    },
    cta: {
      id: 'cta', label: 'Botón de valoración', kind: 'boton', sectionId: 'inicio',
      text: 'Solicita tu primera valoración', href: '#contacto',
      style: base({ fontSize: 14, fontWeight: 650, color: '#111810', background: '#b3ee06', radius: 9, paddingX: 28, paddingY: 16 }),
    },
    secundario: {
      id: 'secundario', label: 'Botón de servicios', kind: 'boton', sectionId: 'inicio',
      text: 'Ver servicios', href: '#servicios',
      style: base({ fontSize: 14, fontWeight: 650, color: '#ffffff', background: 'transparent', radius: 9, paddingX: 28, paddingY: 16 }),
    },
  },
};