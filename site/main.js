import '@fontsource-variable/instrument-sans';
import './styles.css';

const DOWNLOAD_URL = import.meta.env.VITE_DOWNLOAD_URL
  || 'https://github.com/palestino7/monologue/releases/download/v1.0.0/Monologue-Setup-1.0.0-x64.exe';
const VIRUSTOTAL_URL = import.meta.env.VITE_VIRUSTOTAL_URL
  || 'https://www.virustotal.com/gui/file/04bd4487b63f60d7a7b5d7b76d069e39ce84a3f29f35ce49e852220711371fe3';

const copy = {
  'pt-BR': {
    title: 'Monologue — Converse com seus pensamentos',
    description: 'Monologue é um espaço privado e local para colocar seus pensamentos em forma de conversa.',
    'header.download': 'Baixar',
    'hero.eyebrow': 'Seu espaço para pensar',
    'hero.title': 'Converse com seus próprios pensamentos.',
    'hero.description': 'Anotações rápidas com a naturalidade de uma conversa. Sem conta, sem distrações e com tudo salvo no seu dispositivo.',
    'hero.download': 'Baixar para Windows',
    'hero.meta': 'Windows 11 · 64 bits · Versão 1.0.0',
    'hero.trust': 'Grátis · Sem conta · Funciona offline',
    'security.title': 'VirusTotal · 0 de 65 detecções',
    'security.description': 'Relatório do instalador 1.0.0',
    'preview.label': 'Prévia do Monologue',
    'preview.title': 'Pensamentos de hoje',
    'preview.message1': 'Preciso organizar o que aprendi hoje.',
    'preview.message2': 'A ideia principal é simples, mas quero explicar com minhas palavras.',
    'preview.message3': 'Se eu entendi direito…',
    'preview.placeholder': 'Escreva como você pensa...',
    'footer.platform': 'Disponível para Windows 11',
  },
  'en-US': {
    title: 'Monologue — Talk to your own thoughts',
    description: 'Monologue is a private, local space to put your thoughts into a conversation.',
    'header.download': 'Download',
    'hero.eyebrow': 'Your space to think',
    'hero.title': 'Talk to your own thoughts.',
    'hero.description': 'Quick notes with the natural flow of a conversation. No account, no distractions, and everything stays on your device.',
    'hero.download': 'Download for Windows',
    'hero.meta': 'Windows 11 · 64-bit · Version 1.0.0',
    'hero.trust': 'Free · No account · Works offline',
    'security.title': 'VirusTotal · 0 of 65 detections',
    'security.description': 'Installer 1.0.0 report',
    'preview.label': 'Monologue preview',
    'preview.title': "Today's thoughts",
    'preview.message1': 'I need to organize what I learned today.',
    'preview.message2': 'The main idea is simple, but I want to explain it in my own words.',
    'preview.message3': 'If I got this right…',
    'preview.placeholder': 'Write the way you think...',
    'footer.platform': 'Available for Windows 11',
  },
};

function preferredLocale() {
  const stored = localStorage.getItem('monologue.site.locale');
  if (stored === 'pt-BR' || stored === 'en-US') return stored;
  return navigator.languages?.some((language) => language.toLowerCase().startsWith('pt')) ? 'pt-BR' : 'en-US';
}

function applyLocale(locale) {
  const strings = copy[locale];
  document.documentElement.lang = locale;
  document.title = strings.title;
  document.querySelector('meta[name="description"]').content = strings.description;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = strings[element.dataset.i18n];
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    element.setAttribute('aria-label', strings[element.dataset.i18nAria]);
  });
  const languageButton = document.querySelector('.language-button');
  languageButton.textContent = locale === 'pt-BR' ? 'EN' : 'PT';
  languageButton.setAttribute('aria-label', locale === 'pt-BR' ? 'Change language to English' : 'Mudar idioma para português');
  localStorage.setItem('monologue.site.locale', locale);
}

document.querySelectorAll('[data-download]').forEach((link) => {
  link.href = DOWNLOAD_URL;
});

const securityBadge = document.querySelector('[data-virustotal]');
securityBadge.href = VIRUSTOTAL_URL;

let locale = preferredLocale();
applyLocale(locale);

document.querySelector('.language-button').addEventListener('click', () => {
  locale = locale === 'pt-BR' ? 'en-US' : 'pt-BR';
  applyLocale(locale);
});
