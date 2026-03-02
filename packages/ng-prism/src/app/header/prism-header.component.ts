import { Component, inject } from '@angular/core';
import { PrismSearchService } from '../services/prism-search.service.js';
import { PrismThemeService } from '../services/prism-theme.service.js';
import { PrismLayoutMenuComponent } from '../layout-menu/prism-layout-menu.component.js';

@Component({
  selector: 'prism-header',
  standalone: true,
  imports: [PrismLayoutMenuComponent],
  template: `
    <header class="prism-header">
      <div class="prism-header__brand">
        <svg class="prism-header__logo-svg" viewBox="0 0 1600 1600" xmlns="http://www.w3.org/2000/svg">
          <path transform="translate(817,276)" d="m0 0h2l10 18 13 23 11 21 6 10v2h2l4 8 12 20 10 17 7 14 13 23 14 25 4 7 4 8v2h2l8 16 2 6h2l6 12 10 17 7 13 11 19 8 14 9 15 10 18v2h2l6 12v2h2l6 14v2h2l6 12 12 20 6 11 3 5 12 23 16 27 3 4 2 5 5 9v2h2l8 16 10 18 8 13 8 15 5 11 4 7 6 9 10 18 18 32 15 26 8 13 14 24 8 16 13 23 8 14 8 13 14 25 12 20 25 45 12 21 14 24 24 40v3h-10l-8-2-9-5-11-4-12-5-49-23v-2l-10-3-17-7v-2l-9-2-7-4-9-3-4-2v-2l-5-1-20-8-31-13v-2h-5v-2l-7-1-3-1v-2l-10-2-2-1v-2l-8-1v-2l-7-1-5-2v-2l-8-1-3-1v-2h-5v-2l-7-1-31-12v-2l-9-1-15-6-12-4-48-18-13-5v-2h-6l-41-16-29-10-7-3-17-6-28-11-35-12-5-2h-7l-6 2-3 4-1 6-7 12-10 11-9 11-7 7-9 11-14 15-11 12-7 9-12 12-7 8-10 11-9 11-12 13-9 11-9 10-9 11-12 14-8 11-7 10v3l-3 2h-275l-6-2 2-6 11-21 13-23 9-16 12-20 14-25 10-17 14-25 12-20 14-24 11-19 9-15 15-27 17-28 15-27 14-25 8-13 13-24 17-28 14-25 8-13 10-18 14-25 13-23 13-21 12-22 8-12 18-33 6-10 12-19 8-13 3-7 13-23 10-18 6-10 9-16 12-18 5-8 6-10 8-16 11-20 13-22 12-19 2-5h2l1-6 4-5 8-13h2l1-4 6-12 10-16 8-15 12-21z" fill="#FBF9FE"/>
          <path transform="translate(804,308)" d="m0 0 10 1 2 6v25l-1 46-2 133-2 76-2 67-3 8-2 9-7 10-9 10-8 9-10 13-12 16-8 10-7 11-8 11-7 10-6 10-9 14-12 20-11 16-11 17-8 11-16 24-11 16-7 11-6 8-9 14-8 10-6 10-12 16-7 11-16 24-8 11-8 12-7 9-6 9-8 9-6 7-8 5-9 5-36 18-21 9-10 7-18 8-10 6-16 8-19 10-12 6-10 6-14 6-19 10-17 10-10 8-1 3 7-2 17-10 16-8 19-9 16-9 16-8 42-22 45-22 31-16 10-4 9-5 13-5 16-8 34-16 18-8 19-9 21-9 17-8 17-9 28-13 33-15 5-2v3l-3 9-7 11-9 10-9 11-7 7-9 11-14 15-11 12-7 9-12 12-7 8-10 11-9 11-12 13-9 11-9 10-9 11-12 14-8 11-7 10v3l-3 2h-275l-6-2 2-6 11-21 13-23 9-16 12-20 14-25 10-17 14-25 12-20 14-24 11-19 9-15 15-27 17-28 15-27 14-25 8-13 13-24 17-28 14-25 8-13 10-18 14-25 13-23 13-21 12-22 8-12 18-33 6-10 12-19 8-13 3-7 13-23 10-18 6-10 9-16 12-18 5-8 6-10 8-16 11-20 13-22 7-11 1 2-8 15-12 20-7 12-1 3 6-2 4-1 16-24 10-19 6-12 8-13 4-9 4-14 2-1 3-9 5-11 3-6 4-5z" fill="#E13990"/>
          <path transform="translate(757,973)" d="m0 0h7l19 7 21 7 36 14 15 5 9 4 29 10 33 13 6 1v2l5 1 24 9 30 11 10 4 17 6 11 3v2l5 1 28 11 5 1v2h5v2l11 2v2l12 3v2l8 1v2l12 3v2l10 2v2h5v2l9 3 29 12 18 7v2l6 2 10 3 7 4 6 2v2l9 3 10 4 6 2 2 1v2l9 3 35 17 16 6 8 4 10 4 5 3 6 1v1l-8 1h-751l-5-1 2-1-1-3 7-10 8-11 8-9 9-11 26-30 9-10 9-11 14-15 9-10 8-8 7-9 15-16 10-11 9-11 12-13 7-8 9-13 3-6 1-5 4-5z" fill="#5F16BA"/>
          <path transform="translate(817,276)" d="m0 0h2l10 18 13 23 11 21 6 10v2h2l4 8 12 20 10 17 7 14 13 23 14 25 4 7 4 8v2h2l8 16 2 6h2l6 12 10 17 7 13 11 19 8 14 9 15 10 18v2h2l6 12v2h2l6 14v2h2l6 12 12 20 6 11 3 5 12 23 16 27 3 4 2 5 5 9v2h2l8 16 10 18 8 13 8 15 5 11 4 7 6 9 10 18 18 32 15 26 8 13 14 24 8 16 13 23 8 14 8 13 14 25 12 20 25 45 12 21 14 24 24 40v3h-10l-8-2-9-5-11-4-12-5-49-23v-2l-10-3-17-7v-2l-9-2-7-4-9-3-4-2v-2l-5-1-20-8-31-13v-2h-5v-2l-7-1-3-1v-2l-10-2-2-1v-2l-8-1v-2l-7-1-5-2v-2l-8-1-3-1v-2h-5v-2l-7-1-31-12v-2l-9-1-15-6-12-4-48-18-13-5v-2h-6l-41-16-29-10-7-3-17-6-28-11-35-12-5-2h-7l-6 2-13 6-20 9-24 11-3-1 8-4h2v-2l10-5 8-5 8-4 12-4 8-2 5-4 8-1v-2l2-1 2-3 12 2 18 8 13 4v2l9 1 2 1v2l9 1 3 1v2l9 1v2l8 1 12 5 15 5v2l9 1 16 5v2h6v2l8 1 9 3v2l10 2 3 1v2h5l8 3 3 1v2l8 1 5 2v2l10 2v2l12 2 2 1v2l11 3 21 8 20 9 22 8 36 8 5 2-7-13v-7l4 2 5 4 1-2 5 1 14 19 8 11 14 8 27 13 9 4 19 8 29 12 33 16 24 10 15 6 10 6-14-25-11-18-8-13-12-21-6-12-10-17-3-6-6-11-11-20-10-16-5-9-5-8-6-11-6-10-12-18-8-13-4-8-10-21-5-8-2-5-8-13-9-15-4-7v-3h-2l-11-19-3-5v-3l-3-1-3-3-7 1-12-5-5-3-13-4-12-7-8-3-5-4-5-2-1-1-25 2-26-4-18-4-13-5-9-3-6-1h-5l-1 3-4 1-3 3v-5l-6 3h-7l-6-8-13-26-7-13-5-9-6-10-9-14-9-13-8-13-9-15-8-14-8-11-6-9-4-3-9-2v-19l2-53 1-40 1-133-1-5-1-34-1 2-3 99-1 14-2 103-2 82-1 4h-2l3-102 2-105 1-83 1-34v-25l-1-6h-12l-2 4-3 4-5 13-5 10-4 10-2 7-7 14-6 9-11 23-14 22-7 9-9 1 1-4 10-18 13-22 5-11 5-10h2l1-6 4-5 8-13h2l1-4 6-12 10-16 8-15 12-21z" fill="#FAC3F2"/>
          <path transform="translate(804,308)" d="m0 0 10 1 2 6v25l-1 46-2 133-2 76-2 67-3 8-2 9-7 10-9 10-8 9-10 13-12 16-8 10-7 11-8 11-7 10-6 10-9 14-5 8-1-2 9-16-3-3-1-3-1-2-3 1-1-4-1-1-2 2-1-2-16 8-11 6h-2v2l-8 4h-3v2l-10 5-9 6-13 7h-3v2l-11 7-9 5h-3v2l-5 2-9 6h-3v2l-9 4-8 5-4 2-11 6-7 3-2 2-7 3-9 4-2 2-7 3-4 3-6 1h-2l-9 3-2-4-4 1-8 4-4 5-2 2-7 11h-2l-1 5h-2l-2 6-4 5-3 3-2-1 1-2-2-1 3-6 1-8h-2l-1-2-4 2 1-4 8-15 6-9 6-11 13-23 11-20 13-22 13-23 4-10 8-13 10-18 14-25 13-23 13-21 12-22 8-12 18-33 6-10 12-19 8-13 3-7 13-23 10-18 6-10 9-16 12-18 5-8 6-10 8-16 11-20 13-22 7-11 1 2-8 15-12 20-7 12-1 3 6-2 4-1 16-24 10-19 6-12 8-13 4-9 4-14 2-1 3-9 5-11 3-6 4-5z" fill="#FA6CA3"/>
          <path transform="translate(951,798)" d="m0 0 6 1 9 3 13 5 18 4 26 4 26-2 1 2 5 2 5 4 9 3 10 6 13 4 6 4 11 4 8-1 5 5 5 10 9 15v2h2l3 6 8 14 6 9 5 9 6 12 10 19 4 9 8 14 8 11 7 11 8 14 6 11 5 7 6 11 12 20 5 10 5 9 12 22 6 10 7 14 10 17 10 16 15 26 4 8-18-9-25-10-29-14-25-11-22-9-20-8-36-18-9-7-6-9-16-21-8-11-10-14-13-19-20-26-8-10v-2h-2l-8-10-4-7-8-10-22-33-14-19-11-14-15-20-12-17-11-15-6-8-3-6-1-5v-8h2l2-4 5-6 4-1 1-2z" fill="#988DFB"/>
          <path transform="translate(757,973)" d="m0 0h7l19 7 21 7 36 14 15 5 9 4 29 10 33 13 6 1v2l5 1 24 9 30 11 10 4 17 6 11 3v2l5 1 28 11 5 1v2h5v2l11 2v2l12 3v2l8 1v2l12 3v2l10 2v2h5v2l9 3 29 12 18 7v2l6 2 10 3 7 4 6 2v2l9 3 10 4 6 2 2 1v2l9 3 35 17 16 6 8 4 10 4 5 3 6 1v1l-8 1h-317l-8-3-4-5-11-9-26-22-10-8-14-11-17-14-13-11-17-13-28-24-7-7-11-9-12-11-11-9-10-9-8-7-10-8-9-9v-2h-2l-7-8-3-3v-2h-2l-4-9-3-5v-2l-3-1z" fill="#2737D8"/>
          <path transform="translate(919,832)" d="m0 0 5 1 11 17 13 16 13 19 8 10 10 12 8 11 8 14 3 3 3 1 4 8 8 10 6 5 5 2v6l4 6 8 9 11 16 16 24 9 12 12 15 12 19 7 13v2l-17-4-27-6-24-9-25-11-22-8v-2l-14-3v-2l-7-1-3-1v-2l-13-3v-2l-10-2-6-2v-2l-10-2-3-1v-2l-9-2-8-2v-2h-6v-2l-10-2-9-3-6-1v-2l-9-2-16-6-10-3v-2l-9-1v-2l-12-2v-2l-11-2v-2l-10-2-17-7-4-2-12-2 5-5 16-11h2l1-3 4-2 7-8 7-6h2l1-3 5-3h2l1-3 4-2 1-2 3-1 1-2 4-2 5-5 4-2 1-3 9-6 31-29 10-9 8-8 16-14z" fill="#7DD4FE"/>
          <path transform="translate(748,976)" d="m0 0 2 2-2 4-2 6-7 11-9 10-9 11-7 7-9 11-14 15-11 12-7 9-12 12-7 8-10 11-9 11-12 13-9 11-9 10-9 11-12 14-8 11-7 10v3l-3 2h-275l-6-2 2-4v4h19l11-1-1-3 7-3 5-5 24-12 5-2 4-2 2 1 1-2 3-1 2-2 5-4 3-1 1-2 6-2 4-3 4-1 3-4h5-2l-1-4 7-4 4-4 29-15 39-19 33-17 10-4 9-5 13-5 16-8 34-16 18-8 19-9 21-9 17-8 17-9 28-13 33-15z" fill="#A90C79"/>
          <path transform="translate(727,779)" d="m0 0h1v6l-4 6 9-4 4-1 8-6 13-1 9 2 6 4 1 9 1 15-1 14-7 45-3 32-5 21-7 24-4 16-8 7-10 6-37 16-28 13-23 11-33 16-16 8h-3v2l-9 4h-2v2l-16 6-7 3h-3v2l-7 3-5 3-6 2-4 2 6-8 10-12 7-11 4-5 9-13 15-22 16-24 9-12 9-14 8-10 10-16 7-9 6-10 7-10 20-30 8-11 7-11 7-10 15-24 9-15 6-9z" fill="#FAC3F2"/>
          <path transform="translate(817,276)" d="m0 0h2l10 18 13 23 11 21 6 10v2h2l4 8 12 20 10 17 7 14 13 23 14 25 4 7 4 8v2h2l8 16 2 6h2l6 12 10 17 7 13 11 19 8 14 9 15 10 18v2h2l6 12v2h2l6 14v2h2l6 12 12 20 6 11 3 5 12 23 16 27 3 4 2 5 5 9v2h2l8 16 10 18 8 13 8 15 5 11 4 7 6 9 10 18 18 32 15 26 8 13 14 24 8 16 13 23 8 14 8 13 14 25 12 20 25 45 12 21 14 24 24 40v3h-10l-8-2-9-5-11-4-12-5-49-23v-2l-10-3-17-7v-2l-9-2-7-4-9-3-4-2v-2l-5-1-20-8-31-13v-2h-5v-2l-7-1-3-1v-2l-10-2-2-1v-2l-8-1v-2l-7-1-5-2v-2l-8-1-3-1v-2h-5v-2l-7-1-31-12v-2l-9-1-15-6-12-4-48-18-13-5v-2h-6l-41-16-29-10-7-3-17-6-28-11-35-12-5-2h-7l-6 2-13 6-20 9-24 11-3-1 8-4h2v-2l10-5 8-5 8-4 12-4 8-2 5-4 8-1v-2l2-1 2-3 12 2 18 8 13 4v2l9 1 2 1v2l9 1 3 1v2l9 1v2l8 1 12 5 15 5v2l9 1 16 5v2h6v2l8 1 9 3v2l10 2 3 1v2h5l8 3 3 1v2l8 1 5 2v2l10 2v2l12 2 2 1v2l11 3 21 8 20 9 22 8 36 8 5 2-7-13v-7l4 2 5 4 1-2 5 1 14 19 8 11 14 8 27 13 9 4 19 8 29 12 33 16 24 10 15 6 10 6-14-25-11-18-8-13-12-21-6-12-10-17-3-6-6-11-11-20-10-16-5-9-5-8-6-11-6-10-12-18-8-13-4-8-10-21-5-8-2-5-8-13-9-15-4-7v-3h-2l-11-19-5-10v-3h-2l-8-16-3-5-12-21-5-10-10-18-7-14-1-10-7-8-9-15-8-13-6-10-11-20-6-12-6-11-3-4-9-18-6-8-3-7-7-14-9-16-7-11-7-14-5-9-14-25-8-16-14-25-6-12-3-9-7-7-12-19-12-23-8-16-8-12-7-12-5-10-7-11-4-6-5-6-10-21-5-6-5 1-2 3-2 6-2-1-1-22-3-7h-7l-2 4h-2l1-6 12-21z" fill="#F9F6FE"/>
          <path transform="translate(896,1022)" d="m0 0 9 3 21 8 6 1v2l5 1 24 9 30 11 10 4 17 6 11 3v2l5 1 28 11 5 1v2h5v2l11 2v2l12 3v2l8 1v2l12 3v2l10 2v2h5v2l9 3 29 12 18 7v2l6 2 10 3 7 4 6 2v2l9 3 10 4 6 2 2 1v2l9 3 35 17 16 6 8 4 10 4 5 3 6 1v1h-224l-2-3-1-7-6-2-5-3-5-2-3-3v-2l-5-2-4-5-6-4-5-6-5-4-7-8-7-6v-2l-5-2-9-10-7-8-5-5-10-9-3-3-14-10-9-5-10-8-6-4-13-8v-2h-2v-2l-3-1-1-4-5-2-7-6v-2l-7-2-5-3-7-3-18-10-1-2-3-1-1-6z" fill="#2E62F9"/>
          <path transform="translate(951,798)" d="m0 0 6 1 9 3 13 5 18 4 26 4 26-2 1 2 5 2 5 4 9 3 10 6 13 4 6 4 11 4 8-1 5 5 5 10 9 15v2h2l3 6 8 14 6 9 5 9 6 12 2 3-1 4-2 2-3-1-6 1-8-4-2 1h-17l-14-3-7-1-8-3-3 1-1-2-12-2-7-1-5 1-2-1-19-2h-11l-13-1-2 2-5 1-4-1 2 6 3 10 1 5 1 7h-4l-14-21-14-19-11-14-15-20-12-17-11-15-6-8-3-6-1-5v-8h2l2-4 5-6 4-1 1-2z" fill="#BF7CF9"/>
          <path transform="translate(1e3 702)" d="m0 0h3l1 2 2-2 8 3h3l4 2 4 3 2-1 13 6v2h2v2h2l3 3v3h2v2l4 2 10 15 8 11 13 25 4 7 5 5 8 16 7 12 6 11 4 8v2h2l1 5-5-4-7 1-12-5-5-3-13-4-12-7-8-3-5-4-5-2-1-1-25 2-26-4-18-4-13-5-9-3-6-1h-5l-1 3-4 1-3 3v-5l-6 3h-7l-6-8-13-26-7-13-5-9-6-10-9-14-3-7-5-8 1-5 5 2 9 8v2l5 4 2-3h4l2-3 2 4 9-2 4-1 15 1 2 3 4 1 2-1 2 2 2-1v-4h2l1 2 3-2h21l2 1v-2l9-2 12-4 9-1z" fill="#F8ADF3"/>
          <path transform="translate(839,904)" d="m0 0h5l20 16 12 11 16 15 12 11 13 11 8 7 9 8 5 3v2l5 2 11 9 14 11 14 12 11 9 13 10 4 5v3l-5 1-23-8-9-2v-2l-7-1-3-1v-2l-13-3v-2l-10-2-6-2v-2l-10-2-3-1v-2l-9-2-8-2v-2h-6v-2l-10-2-9-3-6-1v-2l-9-2-16-6-10-3v-2l-9-1v-2l-12-2v-2l-11-2v-2l-10-2-17-7-4-2-12-2 5-5 16-11h2l1-3 4-2 7-8 7-6h2l1-3 5-3h2l1-3 4-2 1-2 3-1 1-2 4-2 5-5z" fill="#3052F2"/>
          <path transform="translate(792,793)" d="m0 0 6 2 12 6 19 3 24 5 13 2h19l16 2 8 4 7 6-2 4-13 10-14 11-9 8-9 7-7 7-8 7-12 12-11 9-6 3-10 11-6 4-12 11-1 2-5 3-16 16-3 2-8 2-1 3-5 1 2-9 12-63 6-23 11-54 2-11z" fill="#A2D1FD"/>
          <path transform="translate(1154,1039)" d="m0 0 5 1 8-1v2l4 2v2l3-3 6 1 9 5 5 2 2 3 11 1v5l5 2h5l8 10 12 6 6 6 10 4v-2l3 1 9 9 8 16 12 21 10 16 15 26 4 8-18-9-25-10-29-14-25-11-22-9-20-8-36-18-5-4-1-4 2-1 2-7v-10h2l-1-5v-7l4-8v-5l4-2 2-4 6-1-1-3z" fill="#8783FB"/>
          <path transform="translate(896,1022)" d="m0 0 9 3 21 8 6 1v2l5 1 21 8v4l1 4 5 2 4 3 13 6 26 10 11 6 6 7 4 1 5 5 4 5 15 11 2 2 7 2 8 7 4 6 12 12v2l5 2 6 4 19 6h9l15 4 13 3 7 2 18 10v2h2v2l5 2 6 4 3 1v4l4 2v5l-1 2h-2v3l2 2h-89l-2-3-1-7-6-2-5-3-5-2-3-3v-2l-5-2-4-5-6-4-5-6-5-4-7-8-7-6v-2l-5-2-9-10-7-8-5-5-10-9-3-3-14-10-9-5-10-8-6-4-13-8v-2h-2v-2l-3-1-1-4-5-2-7-6v-2l-7-2-5-3-7-3-18-10-1-2-3-1-1-6z" fill="#3052F2"/>
          <path transform="translate(815,676)" d="m0 0 5 1 6 9 7 14 12 17 13 20 13 23 12 19 5 8 1 5 3 1 5 9 7 9v2l4 2-2 1-7-2-15-2h-20l-31-6-14-3-9-1-5-3-7-3-6-3-1 3 1-7 3-13 2-13 7-43 8-39z" fill="#E9AFF4"/>
          <path transform="translate(819,358)" d="m0 0 2 2 1 34 1 9-1 129-2 66-2 46 9 1 5 4 13 19 6 9 6 11 12 20 11 16 10 16 3 4 6 12 3 5 5 9 11 22 6 9 1 3 9-2 4-1-1 7-5 5h-5v2h-2v2l-2 1h-9l-7-3-5-5-6-8-5-9-3-3-4-8-12-19-14-24-11-18-8-11-10-15-7-14-3-4h-4l-2 4-1 6h-1v-8l2-7 3-3-1-7-2-2h-3l2-82 2-103 2-37v-18l2-58z" fill="#FDFAFE"/>
          <path transform="translate(808,300)" d="m0 0h5l4 8 1 22h1l2-7 3-3 5 1 6 8 10 21 7 8 7 12 5 8 7 14 8 11 19 38 14 22 7 7 6 16 13 23 7 12 8 17 11 19 6 11 8 15 9 15 6 11 8 15 2 5 8 12 3 7 5 9 6 9 5 12 9 16 7 12 18 30 3 4v2l4 2 2 3v8l-4-5-12-18-7-14-10-17-13-21-6-11-8-16-11-20-12-22-6-10-16-29-4-5-3-6-9-17v-2l-4-2-5-9-7-9-5-5-6-11-11-20-9-15-4-6-2-4v-3h-2l-7-11-8-13-6-11-4-7v-2h-2l-3-6-3-9h-2l-5-9-9-16-5-11-10-17-3-3-3-1-1 4-1 26v49l-1 31-1 62h-1v-115l-1-5-1-34-1 2-3 99-1 14-2 103-2 82-1 4h-2l3-102 2-105 1-83 1-34v-25l-1-6h-12l-2 4-3 4-5 13-5 10-4 10-2 7-7 14-6 9-11 23-14 22-7 9-9 1 1-4 10-18 13-22 5-11 5-10h2l1-6 4-5 8-13h2l1-4 6-12 10-16 6-12 1 3z" fill="#FDEAFB"/>
          <path transform="translate(727,779)" d="m0 0h1v6l-4 6 9-4 4-1 8-6 13-1 9 2 6 4 1 9 1 15-1 14-7 45-3 32-5 21-7 24-2 8-1-4 4-17 2-6 2-13 2-9v-14l1-17-1-13-2-5-2-1-4 3-2-6h-2l-1 3-5 3-2 1-2-3-11-1-4-3 1 3-2 2-4-2-12-2-7 1-11 9-3 3h-3v2l-7 5-4-1 1-6 10-13 8-13 7-10 15-24 9-15 6-9z" fill="#FCD9F5"/>
          <path transform="translate(817,276)" d="m0 0h2l10 18 13 23 11 21 6 10v2h2l4 8 12 20 10 17 7 14 13 23 14 25 4 7 3 6v2h-2l1 8 9 19 9 15 9 19 9 16 5 9 12 22 7 10 10 18 3 4 5 12 9 15 8 16 9 16 8 14 8 16 11 17 12 18 6 7 4 1v2l-3 3 1 6 11 20 6 11 9 16 7 5 4 15 4 8v3l4 1h-8l-6-10-12-22-7-13-10-18-7-14-1-10-7-8-9-15-8-13-6-10-11-20-6-12-6-11-3-4-9-18-6-8-3-7-7-14-9-16-7-11-7-14-5-9-14-25-8-16-14-25-6-12-3-9-7-7-12-19-12-23-8-16-8-12-7-12-5-10-7-11-4-6-5-6-10-21-5-6-5 1-2 3-2 6-2-1-1-22-3-7h-7l-2 4h-2l1-6 12-21z" fill="#FDF9FE"/>
          <path transform="translate(782,848)" d="m0 0 5 1 8 6 13 13 7 8 8 9 7 5 5 2-5 5-9 8-6 7-6 4-12 11-1 2-5 3-16 16-3 2-8 2-1 3-5 1 2-9 12-63 6-23 2-10h2z" fill="#3355F2"/>
          <path transform="translate(839,904)" d="m0 0h5l20 16 12 11 16 15 12 11 13 11 8 7 9 8 5 3v2l5 2 11 9 14 11 14 12 11 9 13 10 4 5v3l-5 1-23-8-9-2v-2l-7-1-3-1v-2l-13-3 1-7-7-2-13-6-18-6-1-2 5-1v2l10-2v-5l-6-5 1-2 1 1v-6l4 4-1-4-5-7-1-9-2-2-10-1-7-3 5 7-7-1-1-2-10-4-7-4v-3l-3-1-4-13 3-1-3-4v-2h-2l-3-6-1-3-7-6-4-4-5-2-6-4-9-1-2-5 3-4z" fill="#2E62F9"/>
          <path transform="translate(404,1078)" d="m0 0h5l4 1 5 2v2l2 1-1 2h7l3-1 3 1v2l3-1 4 2v5l-5 5-6 4-2 2h-3l-2 4-4 1v2l-7 2v2l-8 3-1 2h-2v2l-5 2-6 3-1 4h-5l-5 4-1-2-4-1v2l-3 2-8-1v2l-15 2-2-5 1-6h2l1-6 4-8h2l2-7 10-16 4-5 4-1 4 1v-3l3 1 5-1 1-2 5 1 4-2 3 1 1 1z" fill="#CF358D"/>
          <path transform="translate(806,829)" d="m0 0 11 3 10 3 17 8 8 4 14 5 6-1h8l-1 4-10 8-7 7-8 7-12 12-11 9h-3l6-5-4-2-9-7-7-8-12-13-4-7-4-5 1-7 6-7z" fill="#7DD4FE"/>
          <path transform="translate(596,1035)" d="m0 0 2 1-3 4 3 1h11l-4 3-24 11-28 13-21 10-10 4-10 5-17 8-19 10-26 13-23 11-40 21-16 8-22 12-23 11-18 10-3 2-7 1 4-6 12-9 18-10 21-11 10-4 17-10 19-9 7-4 16-8 14-8 11-5 9-6 32-14 10-6 12-5 9-6 8-4 8-5 9-4 5-3h4v-2l20-8 6-1v-2l9-4h2v-2z" fill="#FDF5FD"/>
          <path transform="translate(815,676)" d="m0 0 5 1 6 9 7 14 12 17 13 20 13 23 12 19-1 2-4-4v-2l-3 1-1-4-3 2-1 2-6-1v-2l-9 1-4 1v-3l-9 2v-3l-6 1v-2h-4v-5l-3 1v-3h-2l-2-4 2-7-1-2 7-8 5-8-4 2v-4h-2v2h-2l-1 2-3-9v-3-4l-1-6-4-1-1-5h2l-4-12-1-2-4-1-3 9-6 31-5 30h-1v-7l7-41 7-34z" fill="#FAC4F2"/>
          <path transform="translate(919,832)" d="m0 0 5 1 11 17 13 16 13 19 8 10 10 12 8 11 8 15-7-2v8l-3 1-8-7-9-12-8-9-4-5-11-9-8-9-6-10-7-12-10-6-5-2-1-1v-10l-4-3 10-9z" fill="#A1D1FD"/>
          <path transform="translate(817,276)" d="m0 0h2l10 18 13 23 11 21 6 10v2h2l4 8 12 20 10 17 7 14 13 23 14 25 4 7v2l-6-1-7-8-12-20-9-16-8-16-9-14-8-14-10-17-9-13-5-10-5-13-7-10-4-3-4 1-3 1-1 6h-1l-1-11-3-7h-7l-2 4h-2l1-6 12-21z" fill="#F9F5FD"/>
          <path transform="translate(783,734)" d="m0 0 3 2 1 7-3 23-5 29-4 31-3 18-1 5h-1l1-13 3-21v-10l-2-19-3-3-5-2-9-1-10 1-9 7-5 1-4 2h-3l2-5 1-1 1-8 7-9 7-10 4-6 3 4 5-2 13-11 10-6z" fill="#FDF0FC"/>
          <path transform="translate(882,739)" d="m0 0 5 2 7 11 5 10 7 12 4 7 5 5 6 11 4 5v2l9-2 4-1-1 7-5 5h-5v2h-2v2l-2 1h-9l-7-3-5-5-6-8v-5l-10-17-5-8-8-16-5-11 1-2 12 16 13 16 2 1-6-13-4-12-4-9z" fill="#FDFCFE"/>
          <path transform="translate(826,331)" d="m0 0 5 1 10 17 11 15 6 11 3 6 9 17 8 13 7 16 9 17 12 20 7 11 14 24 6 11v2h2l3 6 7 11 6 11-1 2-6-9-7-10-4-5-2-1-6-11-11-20-9-15-4-6-2-4v-3h-2l-7-11-8-13-6-11-4-7v-2h-2l-3-6-3-9h-2l-5-9-9-16-5-11-10-17-3-3-3-1-1 4-1 26v49l-1 31-1 62h-1v-156l1-19 2-7z" fill="#FDDAF6"/>
          <path transform="translate(1078,746)" d="m0 0 4 1 5 5v2h2l8 16 10 18 8 13 8 15 5 11 4 7 6 9 6 11v2l-5-2h-5l6 16 5 9 1 8 3 1 1 6-4-4-6-11-2-3v-3h-2l-11-19-5-10v-3h-2l-2-7 3-1-5-11-2-6-2-9-8-6-8-15-6-11-11-20-1-6z" fill="#F9F5FD"/>
          <path transform="translate(794,692)" d="m0 0 1 2 3 1-1 8v17l-2 13-9 38-3 12-2 12h-2l1-13 5-30 1-13-2-4-7 3-10 6-14 12-4 1-2-2v-5l7-9 13-17 10-13 9-11z" fill="#FDF7FE"/>
          <path transform="translate(1025,963)" d="m0 0h6l6 5 5 8 5 6v2h2l20 26 9 12 11 16 12 17 9 12-2 1-2-1-1 3-4-2-4-4-2 4-10-16-11-14-10-13-18-27-12-17-9-10-1-7z" fill="#FDF9FD"/>
          <path transform="translate(793,943)" d="m0 0 2 1 1 3 5-2 4-1 21 8 4 5 4 13-1 5-6 2-7 1-3 1h-3v-2l-3 1-5-3-2 1-8-3v-2l-4 1-6-2v-3l-4-1 1-8-4 3-4-1 1-5 9-6h2l1-3z" fill="#2838D8"/>
          <path transform="translate(808,300)" d="m0 0h5l4 8v28h-1l-1-21-1-6h-12l-2 4-3 4-5 13-5 10-4 10-2 7-7 14-6 9-11 23-14 22-7 9-9 1 1-4 10-18 13-22 5-11 5-10h2l1-6 4-5 8-13h2l1-4 6-12 10-16 6-12 1 3z" fill="#FAC3F2"/>
          <path transform="translate(763,964)" d="m0 0 13 2 18 8 13 4v2l9 1 2 1v2l9 1 3 1v2l9 1v2l8 1 12 5-3 1-2 1-3 3 4 4-10-2-41-16-35-12-5-2h-7l-6 2-13 6-20 9-24 11-3-1 8-4h2v-2l10-5 8-5 8-4 12-4 8-2 5-4 8-1v-2l2-1z" fill="#E8E1FC"/>
          <path transform="translate(813,693)" d="m0 0 5 1 4 11v3h-2l2 5 3 1 3 9-2 3 2 4-2 9-5 9-10 11-3 3-6-1-1-1v-13l5-31 4-17z" fill="#F8ADF3"/>
          <path transform="translate(681,996)" d="m0 0h6l1 2-2 3-11 6-8 5-2 2-4 1-1 4-29 13-16 7-4 2-14 1-3-3 4-5 35-17 16-7 16-8 9-4 6-1z" fill="#FEFCFE"/>
          <path transform="translate(792,793)" d="m0 0 6 2 12 6-2 2-9 2-1 4 3 11 3 3 2 5-1 6-3 3-3 4-3 3-1 7 7 9-1 2-9-9-10-5-1 3 1-9 7-35 2-11z" fill="#988FFC"/>
          <path transform="translate(819,358)" d="m0 0 2 2 1 34 1 9-1 129h-1l-1-31-1-2-5 3v-27l2-37v-18l2-58z" fill="#FEF8FE"/>
          <path transform="translate(1067,1029)" d="m0 0 5 5 12 15 12 19 7 13v2l-17-4-15-3 4-2-2-3-2-9-4-6-1-6 2-4 2-1-1-11z" fill="#A1D1FD"/>
          <path transform="translate(403,1141)" d="m0 0 2 1-4 3-3 1 1 3 2-1-1 3-7 1-1 3-7 3-2 2h-5l-1 3-6 2-1 3-6 3-7 3-10 5-7 3-12 6v2l-4 1v2l-3 1v-4l-4-3 5-5 16-8 21-10 16-9 16-8z" fill="#D1388E"/>
          <path transform="translate(596,1035)" d="m0 0 2 1-3 4 3 1h11l-4 3-24 11-28 13-12 6-2-1 1-3 4-1-2-4v-3l7-5h4v-2l20-8 6-1v-2l9-4h2v-2z" fill="#FDEAFB"/>
          <path transform="translate(683,1006)" d="m0 0 2 1-14 8-29 14-19 9-9 3-8 4h-2v2l-29 13-8 4-15 5v2l-8 4-1 2-8 3-6 3h-5l-2 2-5 2-3 3-2-1v2l-4 1-2 3v-2l-3 2-3 1-1 2h-3v2h-3l-3 3-4 1v2l-9 3-2-1-1 3-4-1-4 3-13 5-12 6-4-1 39-19 33-17 10-4 9-5 13-5 16-8 34-16 18-8 19-9 21-9 17-8z" fill="#D94192"/>
          <path transform="translate(733,971)" d="m0 0h2l2 2h7l6-1-5 5-13 3-16 8-10 6-5 1v2l-8 4h-2v2l-16 8-13 7h-2l1-4 5-2 5-4 11-6 4-2 1-3h-6l-5 2v-2l21-10 35-15z" fill="#FDF0FC"/>
          <path transform="translate(797,976)" d="m0 0 7 1 3 1v2l9 1 2 1v2l9 1 3 1v2l9 1v2l8 1 12 5-3 1-2 1-3 3 4 4-10-2-34-13-3-3-6-3-1-3 1-3-5-2z" fill="#ECECFD"/>
          <path transform="translate(1128,830)" d="m0 0 5 5 10 17 1 4-5-2h-5l6 16 5 9 1 8 3 1 1 6-4-4-6-11-2-3v-3h-2l-11-19-5-10v-3h-2l-2-7 12-2z" fill="#FBEEFC"/>
          <path transform="translate(769,849)" d="m0 0h1l-1 16-1 7v14l2 1 1-4h1v7l-4 20h-3l-1 9-3 1-3 15-4 12-2 12-8 8v2l13-1v2l-13 4h-8l-1-4 11-8 2-3 5-21 9-32 2-15 3-31z" fill="#FDF6FE"/>
          <path transform="translate(808,300)" d="m0 0h5l4 8v28h-1l-1-21-1-6h-12l-2 4-3 4-5 13-5 10-4 10-2 7-4 8h-2l2-14-3 3h-2l4-8h2l1-4 6-12 10-16 6-12 1 3z" fill="#F2A8DE"/>
          <path transform="translate(775,351)" d="m0 0h2v9l-2 9-7 11-11 23h-2l1-9 1-10 1-2-3 1 2-5 4-8h2l1-6 8-10h2z" fill="#F6B7E9"/>
          <path transform="translate(1007,927)" d="m0 0 4 4 17 26 4 5-1 2h-6l-2 3 1-6-7-2-8-8-8-12v-3l-4-1 2-1 9-1z" fill="#FDF8FD"/>
          <path transform="translate(722,446)" d="m0 0 2 4-4 10-3 6-6 8-5 4-7 11-4 13-5 1 1-3-4 1 5-10 7-10 6-9 4-4 3-12 4-5h2l2-4z" fill="#FAC3F2"/>
          <path transform="translate(317,1185)" d="m0 0 2 1v2l3 3-4 4h-2l2 4-19 1-12-1 1-5 3-5 5 2 5-4 2 1-4 5 8-2z" fill="#E03B90"/>
          <path transform="translate(683,1006)" d="m0 0 2 1-14 8-29 14-19 9-9 3-8 4h-2v2l-29 13-8 4-9 3-6 3-3-1 27-13 33-15 19-9 21-9 17-8z" fill="#EF5C9D"/>
          <path transform="translate(526,777)" d="m0 0 1 2-13 24-10 16-14 25-12 22-7 11-6 11-8 14-5 9h-2l2-5 13-24 14-24 8-14 15-27 13-21z" fill="#BE268C"/>
          <path transform="translate(512,1046)" d="m0 0 3 1-1 4h-2l-1 4-5 4-3 1-5 5-3-1v2l-4 1-7 4-4-1 4-7 1-3h4v-2l11-4 8-6z" fill="#CF358D"/>
          <path transform="translate(758,971)" d="m0 0 10 2 6 3-3 1-7-3h-7l-6 2-13 6-20 9-24 11-3-1 8-4h2v-2l10-5 8-5 8-4 12-4 8-2 3-3z" fill="#FCD3F4"/>
          <path transform="translate(779,795)" d="m0 0h1l-1 17-3 22-2 12-2 9-1 28-1 4-3-1v-14l4-28 4-23 3-25z" fill="#FEFAFF"/>
          <path transform="translate(1081,829)" d="m0 0 13 1 3 2 6 1 5 3 4-1v-5l4 4 2 7h2l1 5-5-4-7 1-12-5-5-3-13-4z" fill="#E9AFF4"/>
          <path transform="translate(688,991)" d="m0 0h6l1 4-8 8h-3l-1 4-21 11h-2l1-4 5-2 5-4 11-6 4-2 1-3h-6l-5 2v-2z" fill="#FDF3FD"/>
          <path transform="translate(998,920)" d="m0 0h5l4 5 1 8-9 2-5-3-2-3v-6l6-1z" fill="#FDFAFE"/>
          <path transform="translate(653,1018)" d="m0 0h7l-4 3-25 11-16 7-6 2 4-4h3v-2h3v-2l4-2h3l2-4 16-6 7-2z" fill="#FDEFFC"/>
          <path transform="translate(990,1054)" d="m0 0 12 3 5 2 2 3 4-1 16 6 2 4 4-1 1 3 4 2-6-1-5-2v-2l-9-1-15-6-12-4-7-3z" fill="#D9D9FC"/>
          <path transform="translate(808,300)" d="m0 0h5l4 8v28h-1l-1-21-1-6h-12l-2 4-3 2 1-7 3-6 1 3z" fill="#F7BAEC"/>
          <path transform="translate(547,1070)" d="m0 0h5l-4 3-4 2-1 2-8 3-6 3h-5l-2 2-5 2-3 3-2-1v2l-4 1-2 3v-2l-5-1 4-3 14-6 9-5 13-5z" fill="#DC4493"/>
          <path transform="translate(1128,833)" d="m0 0 4 1 6 9 1 4-1 1-7-1-9-6 1-5z" fill="#FAF3FC"/>
          <path transform="translate(1098,1053)" d="m0 0 5 4 7 11-4-1-1 3-4-2-4-4-2 4-6-10 1-3 2 3 4-3h2z" fill="#FDF5FD"/>
          <path transform="translate(449,940)" d="m0 0 1 3-3 8-6 11-6 9-3 1v-6h2l1-6 3-1 1-6 4-2-1-4 2-3h2v-2z" fill="#FB6DA4"/>
          <path transform="translate(748,976)" d="m0 0 2 2-3 4h-2v2h-3v2l-9 1-18 8-9 3-3-1 32-15z" fill="#EA569A"/>
          <path transform="translate(816,674)" d="m0 0 6 2 3 4v3h2l8 16 8 12 7 9 5 9 2 6-4-4-7-11-16-23-8-16-3-4-4-2z" fill="#FEF1FD"/>
          <path transform="translate(792,793)" d="m0 0 6 2 12 6-2 2-9 2h-9l1-9z" fill="#BF7DF9"/>
          <path transform="translate(626,1028)" d="m0 0m-4 1h4v2l-7 2v2h-3v2l-7 4-12 1-3-3 4-5 4-1 2 4 4-2 3-2z" fill="#FEF8FE"/>
          <path transform="translate(931,813)" d="m0 0h1l3 15 8 11 7 9v1h-5l-6-5v-2h-2l-4-9-3-14-1-4z" fill="#FAE7FB"/>
          <path transform="translate(667,551)" d="m0 0h1v5l-11 20-2 3-3-1 1-7 4-5 2-5 4-6h2z" fill="#FAC3F2"/>
          <path transform="translate(774,957)" d="m0 0 2 3 4-1 3-1v8l3 1 1 4-5-1-6-3-12-2 5-5z" fill="#3F5BF3"/>
          <path transform="translate(775,351)" d="m0 0h2v9l-5 10-4 4-4-2 1-5 3-3 4-10h2z" fill="#FDE9FA"/>
          <path transform="translate(526,777)" d="m0 0 1 2-13 24-10 16-14 25h-2l2-5 12-22 13-21z" fill="#BB248B"/>
          <path transform="translate(809,289)" d="m0 0 3 1v2l4 2v11l-2-1-1-3h-7l-2 4h-2l1-6z" fill="#FBD4F2"/>
          <path transform="translate(754,383)" d="m0 0 1 2-8 15-12 20-7 12-1 3-3 1 2-6 8-14 13-22z" fill="#D34B9E"/>
          <path transform="translate(758,381)" d="m0 0v3l-1 10-2 9-3 3h-2l-1-9 2-6 5-9z" fill="#FCD7F5"/>
          <path transform="translate(683,1006)" d="m0 0 2 1-14 8-29 14-19 9-3-1 6-2v-2l30-13 19-10z" fill="#E54D97"/>
          <path transform="translate(769,849)" d="m0 0h1l-1 16-1 7v15l-3 17-2 6-1-4 2-15 3-31z" fill="#FEF1FD"/>
          <path transform="translate(1007,927)" d="m0 0 4 4 8 12-1 2-7-5-4-2-3 1-1 3-2-3v-3l-4-1 2-1 9-1z" fill="#FEF8FE"/>
          <path transform="translate(758,971)" d="m0 0 10 2 6 3-3 1-7-3h-7l-6 2-13 6-9 4-3-1 5-2 2-4 14-4 3-3z" fill="#FBCBF3"/>
          <path transform="translate(996,934)" d="m0 0 5 2 4 8 7 9v1l-7-1-3-4-3-5-4-5z" fill="#A2D1FD"/>
          <path transform="translate(807,701)" d="m0 0 1 4-6 33-1 6h-1v-18l2-3v-13l1-4h2z" fill="#FEF8FE"/>
          <path transform="translate(301,1187)" d="m0 0 2 1-4 5h5l-4 3-7 3h-6l1-5 3-5 5 2z" fill="#FB6DA4"/>
          <path transform="translate(745,963)" d="m0 0 2 1-3 3v2l13-1v2l-13 4h-8l-1-4z" fill="#FEF9FE"/>
          <path transform="translate(1144,1101)" d="m0 0 14 7v3h7l4 3 5 3v2l-6-2-27-13z" fill="#9A9EFC"/>
          <path transform="translate(722,446)" d="m0 0 2 4-4 10-1 2h-2v-5h-3l-1 3-2-1 4-7 3-1 2-4z" fill="#F6B5E7"/>
          <path transform="translate(1147,1118)" d="m0 0h9l12 5 2 4 9 3-3 1-20-8-9-4z" fill="#CFD0FC"/>
          <path transform="translate(710,460)" d="m0 0 1 3-2 7-5 5-8 12-4 5-3 6h-2l2-5 14-22 4-5z" fill="#D34B9D"/>
          <path transform="translate(551,733)" d="m0 0 1 2-8 16-10 17-6 9-1-2 11-19 9-16z" fill="#B9248B"/>
          <path transform="translate(1296,1170)" d="m0 0h8l5 2 5 10-18-9-3-2z" fill="#9A9FFC"/>
          <path transform="translate(1077,763)" d="m0 0 3 3 7 13 6 9 4 7v6l-2-2-5-10-10-18-3-6z" fill="#FEF1FD"/>
          <path transform="translate(538,1064)" d="m0 0 5 1 2 2-3 3h-2l-1 5-10 2 2-4 6-2z" fill="#FDF7FE"/>
          <path transform="translate(1050,812)" d="m0 0 9 1 6 8-5 1-6-5-5-2z" fill="#E9AEF4"/>
          <path transform="translate(748,976)" d="m0 0 2 2-3 4h-2v2h-3v2l-11 1 3-3 4-1v-2z" fill="#DC4593"/>
          <path transform="translate(927,813)" d="m0 0 4 1-1 5-8 3-4 2v-2l-4-2 1-2 10-1v-2h2z" fill="#FDF7FE"/>
          <path transform="translate(990,1054)" d="m0 0 12 3 5 2 1 2h-10l-12-5z" fill="#F6EEFD"/>
          <path transform="translate(658,548)" d="m0 0h2l-2 7-6 11-3 6-2-1 3-7 4-9z" fill="#F29DD4"/>
          <path transform="translate(466,1109)" d="m0 0 4 1-4 3-13 5-12 6-4-1z" fill="#DE4794"/>
          <path transform="translate(311,1181)" d="m0 0 2 1-4 4h-2v3l5-1-5 4-9 2 4-6z" fill="#FBD3F5"/>
          <path transform="translate(775,351)" d="m0 0h2v9l-4 8-1-2v-6h-2l2-6h2z" fill="#FCD4F4"/>
          <path transform="translate(1023,951)" d="m0 0 4 4 4 6v3h-6l-2 3 1-6-5-1v-1l5-1z" fill="#F6CDF6"/>
          <path transform="translate(809,289)" d="m0 0 3 1v2l4 2-1 3-7 1-3 1 1-5z" fill="#F9DEF4"/>
          <path transform="translate(770,967)" d="m0 0 7 1 9 4v1h-7l-3-1h-6l-1-4z" fill="#FDFAFE"/>
          <path transform="translate(626,1030)" d="m0 0h5v2l-16 7-6 2 4-4h3v-2h3v-2z" fill="#FBD6F6"/>
          <path transform="translate(540,1057)" d="m0 0 8 1-5 4-8 3-4 2 6-8z" fill="#FCD7F5"/>
          <path transform="translate(992,946)" d="m0 0h6l3 5-1 4-5-2z" fill="#A2D1FD"/>
          <path transform="translate(1163,889)" d="m0 0 3 4 6 10v2h-3v-2l-3-1-1-4-3-7z" fill="#EEDEFC"/>
          <path transform="translate(547,1070)" d="m0 0h5l-4 3-4 2-1 2-8 1-3-1z" fill="#E34C96"/>
          <path transform="translate(727,779)" d="m0 0h1v6l-6 8h-2l-2 4-2 1 2-5 7-10z" fill="#FBD1F4"/>
          <path transform="translate(754,383)" d="m0 0 1 2-8 15-3 5-3 1 2-5z" fill="#CE449A"/>
          <path transform="translate(500,821)" d="m0 0 1 4-10 17-1 2h-2l2-5z" fill="#B32390"/>
          <path transform="translate(1027,973)" d="m0 0 5 4 11 15h-3l-8-10-4-6z" fill="#A2D1FD"/>
          <path transform="translate(1088,1038)" d="m0 0 4 4 4 6v2l-4-1-4-5-1-3z" fill="#FDEFFC"/>
          <path transform="translate(840,998)" d="m0 0 4 1v3l10 2 1 2-10-2-10-4 4-1z" fill="#BFC6FC"/>
          <path transform="translate(810,287)" d="m0 0 5 2 2 3v16h-1l-1-14-5-3z" fill="#FDF1FB"/>
          <path transform="translate(1147,1118)" d="m0 0h9l7 4v1h-7l-9-4z" fill="#DBD9FC"/>
          <path transform="translate(1136,1111)" d="m0 0 6 1 5 6-5-1-10-4z" fill="#D6D6FC"/>
          <path transform="translate(758,971)" d="m0 0 10 2 6 3-3 1-7-3h-7l-6 2-2 1 2-4z" fill="#9B8BF8"/>
          <path transform="translate(462,889)" d="m0 0 1 2-8 14-3 6h-2l2-5 9-16z" fill="#BF268A"/>
          <path transform="translate(714,457)" d="m0 0h3v6l-4 3h-2v-6z" fill="#FCD8F5"/>
          <path transform="translate(709,991)" d="m0 0m-1 1 1 3-15 7-3-1 8-4h2v-2z" fill="#FBCEF4"/>
          <path transform="translate(718,990)" d="m0 0h4v2l-7 3-9 3-3-1z" fill="#E9549A"/>
          <path transform="translate(1128,830)" d="m0 0 2 1v2l-9 4h-2l-1 4-2-7 12-2z" fill="#F7DBF9"/>
          <path transform="translate(499,1092)" d="m0 0h3l1 3-3 1-1 2h-3v2l-4-1 5-6z" fill="#D1378D"/>
          <path transform="translate(771,355)" d="m0 0v3l-3 8-5 2 2-5z" fill="#DB72B9"/>
          <path transform="translate(1162,1111)" d="m0 0 4 1 3 2 5 3v2l-6-2-7-3z" fill="#9A9BFC"/>
          <path transform="translate(1007,927)" d="m0 0 4 4 8 12-1 2-6-8-4-4z" fill="#F5CDF6"/>
          <path transform="translate(1098,802)" d="m0 0 5 3 2 4v6l-3-4-4-7z" fill="#FEF1FD"/>
          <path transform="translate(507,1088)" d="m0 0h4l-2 4-3 3v-2l-5-1 4-3z" fill="#D74091"/>
          <path transform="translate(598,1046)" d="m0 0h6l-4 3-9 4-3-1 6-2v-2z" fill="#E04694"/>
          <path transform="translate(1151,894)" d="m0 0h2v2h2l2 6-1 4-6-9z" fill="#F9E2FA"/>
          <path transform="translate(427,1128)" d="m0 0 2 1-3 3-5 2-3 2-4-1z" fill="#DC4593"/>
          <path transform="translate(1017,959)" d="m0 0 7 2v8l-4-4-3-4z" fill="#A2D1FD"/>
          <path transform="translate(1e3 933)" d="m0 0 3 1-1 3-2 1-2 3-1-5-4-1 2-1z" fill="#FDDAF6"/>
          <path transform="translate(1173,907)" d="m0 0 3 3 4 7-1 2-5-5z" fill="#ECDCFC"/>
          <path transform="translate(403,1141)" d="m0 0 2 1-4 3-8 4-4-1z" fill="#DB4493"/>
          <path transform="translate(908,816)" d="m0 0 7 2 1 3 2 1-1 4-2-1-2-4z" fill="#F9D7F7"/>
          <path transform="translate(972,1050)" d="m0 0h8v2h4v2l2 1-9-2-5-2z" fill="#C8C7FB"/>
          <path transform="translate(766,908)" d="m0 0h1v8l-2 3-2-6z" fill="#FDFBFE"/>
          <path transform="translate(990,1054)" d="m0 0 5 2 3 4-5-1-7-3z" fill="#C7C9FC"/>
          <path transform="translate(836,889)" d="m0 0 1 4-7 6-2-1 6-5-4-3z" fill="#9A9EFC"/>
          <path transform="translate(931,813)" d="m0 0h1l2 15-2-2-3-8 1-4z" fill="#F0BAF4"/>
        </svg>
        <span class="prism-header__logo-text">ng-prism</span>
      </div>
      <div class="prism-header__search">
        <input
          type="text"
          class="prism-header__input"
          placeholder="Search... ⌘K"
          [value]="searchService.query()"
          (input)="searchService.search($any($event.target).value)"
        />
      </div>
      <prism-layout-menu />
      <button
        class="prism-header__theme-toggle"
        (click)="themeService.toggle()"
        [title]="themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        @if (themeService.isDark()) {
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        } @else {
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
          </svg>
        }
      </button>
    </header>
  `,
  styles: `
    .prism-header {
      display: flex;
      align-items: center;
      gap: 16px;
      height: var(--prism-header-height);
      padding: 0 20px;
      background: color-mix(in srgb, var(--prism-bg) 80%, transparent);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--prism-border);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .prism-header__brand {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .prism-header__logo-svg {
      width: 28px;
      height: 28px;
    }
    .prism-header__logo-text {
      font-size: 15px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--prism-primary), var(--prism-accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      white-space: nowrap;
    }
    .prism-header__search {
      flex: 1;
      max-width: 320px;
    }
    .prism-header__input {
      width: 100%;
      padding: 6px 12px;
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius);
      font-size: 13px;
      font-family: var(--prism-font-sans);
      color: var(--prism-text);
      background: var(--prism-input-bg);
      transition: box-shadow 0.15s;
    }
    .prism-header__input:focus {
      outline: none;
      box-shadow: 0 0 0 2px var(--prism-primary);
    }
    .prism-header__input::placeholder {
      color: var(--prism-text-muted);
    }
    .prism-header__theme-toggle {
      margin-left: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid var(--prism-border);
      border-radius: var(--prism-radius-sm);
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      color: var(--prism-text-muted);
      transition: border-color 0.15s, background 0.15s;
      flex-shrink: 0;
    }
    .prism-header__theme-toggle:hover {
      border-color: var(--prism-primary);
      background: var(--prism-glow);
    }
  `,
})
export class PrismHeaderComponent {
  protected readonly searchService = inject(PrismSearchService);
  protected readonly themeService = inject(PrismThemeService);
}
