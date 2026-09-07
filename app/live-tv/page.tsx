'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import styles from './liveTv.module.css';

export interface Channel {
  id: string;
  name: string;
  category: 'Movies' | 'News' | 'Sports' | 'Music' | 'Entertainment' | 'Kids' | 'Documentary' | 'Religious' | 'General';
  country: string;
  quality: string;
  logo: string;
  streamUrl: string;
}

const HINDI_CHANNELS: Channel[] = [
  // ==================== MOVIES ====================
  {
    id: 'and-xplor-hd',
    name: '&xplor HD',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/AndXplorHD.in.png',
    streamUrl: 'http://66.102.126.10:8000/play/a028/index.m3u8'
  },
  {
    id: 'and-tv',
    name: '&TV',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/AndTV.in.png',
    streamUrl: 'https://amg01117-amg01117c1-amgplt0029.playout.now3.amagi.tv/playlist/amg01117-amg01117c1-amgplt0029/playlist.m3u8'
  },
  {
    id: 'and-pictures',
    name: '&pictures',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/AndPictures.in.png',
    streamUrl: 'https://tvsen3.aynaott.com/jzT482XQ/index.m3u8'
  },
  {
    id: 'zee-cinema',
    name: 'Zee Cinema',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ZeeCinema.in.png',
    streamUrl: 'https://amg17931-zee-amg17931c5-samsung-au-8873.playouts.now.amagi.tv/playlist.m3u8'
  },
  {
    id: 'zee-bollywood',
    name: 'Zee Bollywood',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '580p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ZeeBollywood.in.png',
    streamUrl: 'https://s3.itcnbd.live/channel/a5979fd53c01d1b2.m3u8'
  },
  {
    id: 'zee-action',
    name: 'Zee Action',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ZeeAction.in.png',
    streamUrl: 'http://103.175.73.12:8080/live/270/master.m3u8'
  },
  {
    id: 'zee-cine-classic',
    name: 'Zee Cine Classic',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ZeeCineClassic.in.png',
    streamUrl: 'https://amg00862-amg00862c8-amgplt0173.playout.now3.amagi.tv/playlist/amg00862-amg00862c8-amgplt0173/playlist.m3u8'
  },
  {
    id: 'zee-south-flix',
    name: 'Zee South Flix',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ZeeSouthFlix.in.png',
    streamUrl: 'https://amg00862-amg00862c9-amgplt0173.playout.now3.amagi.tv/playlist/amg00862-amg00862c9-amgplt0173/playlist.m3u8'
  },
  {
    id: 'colors-cineplex',
    name: 'Colors Cineplex',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ColorsCineplex.in.png',
    streamUrl: 'http://66.102.126.10:8000/play/a076/index.m3u8'
  },
  {
    id: 'colors-cineplex-bollywood',
    name: 'Colors Cineplex Bollywood',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ColorsCineplexBollywood.in.png',
    streamUrl: 'http://202.70.146.135:8000/play/a058/index.m3u8'
  },
  {
    id: 'star-gold',
    name: 'Star Gold',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/StarGold.in.png',
    streamUrl: 'http://66.102.126.10:8000/play/a00f/index.m3u8'
  },
  {
    id: 'star-gold-2',
    name: 'Star Gold 2',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/StarGold2.in.png',
    streamUrl: 'http://66.102.126.10:8000/play/a077/index.m3u8'
  },
  {
    id: 'star-gold-romance',
    name: 'Star Gold Romance',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/StarGoldRomance.in.png',
    streamUrl: 'http://66.102.126.10:8000/play/a00r/index.m3u8'
  },
  {
    id: 'star-gold-select',
    name: 'Star Gold Select',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/StarGoldSelect.in.png',
    streamUrl: 'http://66.102.126.10:8000/play/a01s/index.m3u8'
  },
  {
    id: 'star-gold-thrills',
    name: 'Star Gold Thrills',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/StarGoldThrills.in.png',
    streamUrl: 'http://66.102.126.10:8000/play/a00c/index.m3u8'
  },
  {
    id: 'star-movies',
    name: 'Star Movies',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/StarMovies.in.png',
    streamUrl: 'http://66.102.126.10:8000/play/a021/index.m3u8'
  },
  {
    id: 'star-movies-select',
    name: 'Star Movies Select',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/StarMoviesSelect.in.png',
    streamUrl: 'http://66.102.126.10:8000/play/a020/index.m3u8'
  },
  {
    id: 'sony-max',
    name: 'Sony Max',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SonyMax.in.png',
    streamUrl: 'https://cloudplay-sonyliv.pages.dev/maxhd.m3u8'
  },
  {
    id: 'sony-max-2',
    name: 'Sony Max 2',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SonyMax2.in.png',
    streamUrl: 'https://cloudplay-sonyliv.pages.dev/max2.m3u8'
  },
  {
    id: 'sony-wah',
    name: 'Sony Wah',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SonyWah.in.png',
    streamUrl: 'https://cloudplay-sonyliv.pages.dev/wah.m3u8'
  },
  {
    id: 'sony-pix',
    name: 'Sony Pix',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SonyPix.in.png',
    streamUrl: 'https://cloudplay-sonyliv.pages.dev/pixhd.m3u8'
  },
  {
    id: 'b4u-movies',
    name: 'B4U Movies',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/B4UMovies.in.png',
    streamUrl: 'https://streams.tangotv.in/B4UMOVIES/ORIGIN/index.m3u8'
  },
  {
    id: 'b4u-kadak',
    name: 'B4U Kadak',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/B4UKadak.in.png',
    streamUrl: 'https://streams.tangotv.in/B4UKADAK/ORIGIN/index.m3u8'
  },
  {
    id: 'goldmines',
    name: 'Goldmines',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/Goldmines.in.png',
    streamUrl: 'https://streams.tangotv.in/GOLDMINES/ORIGIN/index.m3u8'
  },
  {
    id: 'goldmines-bollywood',
    name: 'Goldmines Bollywood',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/GoldminesBollywood.in.png',
    streamUrl: 'https://streams.tangotv.in/GOLDMINESBOLLYWOOD/ORIGIN/index.m3u8'
  },
  {
    id: 'goldmines-movies',
    name: 'Goldmines Movies',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/GoldminesMovies.in.png',
    streamUrl: 'https://streams.tangotv.in/GOLDMINEMOVIES/ORIGIN/index.m3u8'
  },
  {
    id: 'maha-movie',
    name: 'Maha Movie',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/MahaMovie.in.png',
    streamUrl: 'https://cdn-6.pishow.tv/live/10007/master.m3u8'
  },
  {
    id: 'manoranjan-grand',
    name: 'Manoranjan Grand',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ManoranjanGrand.in.png',
    streamUrl: 'https://streams.tangotv.in/MANORANJANGRAND/ORIGIN/index.m3u8'
  },
  {
    id: 'shubh-cinema',
    name: 'Shubh Cinema TV',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ShubhCinema.in.png',
    streamUrl: 'https://d393sxaxig6bax.cloudfront.net/out/v1/589cf2cf44bf42bb941e817a2240d62e/index.m3u8'
  },
  {
    id: 'bollywood-hd',
    name: 'Bollywood HD',
    category: 'Movies',
    country: '🇷🇴 Romania',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/BollywoodHD.ro.png',
    streamUrl: 'http://103.213.31.109:90/BollywoodHD/playlist.m3u8'
  },
  {
    id: 'the-movie-club',
    name: 'The Movie Club',
    category: 'Movies',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/TheMovieClub.in.png',
    streamUrl: 'https://sis-global.prod.samsungtv.plus/v1/tvpprd/sc-mp2ar4ca425xo.m3u8'
  },

  // ==================== SPORTS ====================
  {
    id: 'star-sports-1-hindi',
    name: 'Star Sports 1 Hindi',
    category: 'Sports',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/StarSports1Hindi.in.png',
    streamUrl: 'http://103.253.18.58:8000/play/a00t'
  },
  {
    id: 'star-sports-2',
    name: 'Star Sports 2',
    category: 'Sports',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/StarSports2.in.png',
    streamUrl: 'https://tvsen7.aynaott.com/ssport2hd/index.m3u8'
  },
  {
    id: 'star-sports-2-hindi',
    name: 'Star Sports 2 Hindi',
    category: 'Sports',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/StarSports2Hindi.in.png',
    streamUrl: 'http://103.157.248.140:8000/play/a01m/index.m3u8'
  },
  {
    id: 'sony-sports-ten-3',
    name: 'Sony Sports Ten 3 Hindi',
    category: 'Sports',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SonySportsTen3.in.png',
    streamUrl: 'https://cloudplay-sonyliv.pages.dev/ten3hd.m3u8'
  },
  {
    id: 'dd-sports',
    name: 'DD Sports',
    category: 'Sports',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/DDSports.in.png',
    streamUrl: 'https://d3qs3d2rkhfqrt.cloudfront.net/out/v1/b17adfe543354fdd8d189b110617cddd/index.m3u8'
  },
  {
    id: 'kabaddi-247',
    name: 'Kabaddi 24x7',
    category: 'Sports',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/Kabaddi247.in.png',
    streamUrl: 'http://180.188.254.253/live/KABADDI24X7.m3u8'
  },

  // ==================== NEWS ====================
  {
    id: 'aajtakhd',
    name: 'Aaj Tak HD',
    category: 'News',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/AajTak.in.png',
    streamUrl: 'https://feeds.intoday.in/aajtak/api/aajtakhd/master.m3u8'
  },
  {
    id: 'abp-news',
    name: 'ABP News',
    category: 'News',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ABPNews.in.png',
    streamUrl: 'https://d2l4ar6y3mrs4k.cloudfront.net/live-streaming/abpnews-livetv/master.m3u8'
  },
  {
    id: 'republic-bharat',
    name: 'Republic Bharat',
    category: 'News',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/RepublicBharat.in.png',
    streamUrl: 'https://vg-republictvlive.akamaized.net/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/vglive-sk-275673/main.m3u8'
  },
  {
    id: 'ndtv-india',
    name: 'NDTV India',
    category: 'News',
    country: '🇮🇳 India',
    quality: '480p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/NDTVIndia.in.png',
    streamUrl: 'https://ndtvindiaelemarchana.akamaized.net/hls/live/2003679/ndtvindia/master.m3u8'
  },
  {
    id: 'news18-india',
    name: 'News18 India',
    category: 'News',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/News18India.in.png',
    streamUrl: 'https://n18syndication.akamaized.net/bpk-tv/News18_India_NW18_MOB/output01/master.m3u8'
  },
  {
    id: 'tv9-bharatvarsh',
    name: 'TV9 Bharatvarsh',
    category: 'News',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/TV9Bharatvarsh.in.png',
    streamUrl: 'https://dyjmyiv3bp2ez.cloudfront.net/pub-iotv9hinjzgtpe/liveabr/playlist.m3u8'
  },
  {
    id: 'zee-news',
    name: 'Zee News',
    category: 'News',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ZeeNews.in.png',
    streamUrl: 'https://dknttpxmr0dwf.cloudfront.net/index_57.m3u8'
  },
  {
    id: 'zee-bharat',
    name: 'Zee Bharat',
    category: 'News',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ZeeBharat.in.png',
    streamUrl: 'https://vg-zeefta.akamaized.net/ptnr-yupptv/title-zeehindustan/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/96bbab12-582e-4540-af70-510ab6824581/main.m3u8'
  },
  {
    id: 'zee-business',
    name: 'Zee Business',
    category: 'News',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ZeeBusiness.in.png',
    streamUrl: 'https://dwby15d04agvq.cloudfront.net/index_5.m3u8'
  },
  {
    id: 'times-now-navbharat',
    name: 'Times Now Navbharat',
    category: 'News',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/TimesNowNavbharat.in.png',
    streamUrl: 'https://yupprestreamliveus.akamaized.net/v1/vglive-sk-717514/main.m3u8'
  },
  {
    id: 'cnbc-awaaz',
    name: 'CNBC Awaaz',
    category: 'News',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/CNBCAwaaz.in.png',
    streamUrl: 'https://n18syndication.akamaized.net/bpk-tv/CNBC_Awaaz_NW18_MOB/output01/master.m3u8'
  },
  {
    id: 'india-tv',
    name: 'India TV',
    category: 'News',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/IndiaTV.in.png',
    streamUrl: 'https://pl-indiatvnews.akamaized.net/out/v1/db79179b608641ceaa5a4d0dd0dca8da/index.m3u8'
  },
  {
    id: 'good-news-today',
    name: 'Good News Today',
    category: 'News',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/GoodNewsToday.in.png',
    streamUrl: 'https://aajtaklive.vgcdn.net/v1/master/611d79b11b77e2f571934fd80ca1413453772ac7/3196cced-ce29-4219-9809-f07ccdaa02b9/vglive-sk-848805/master.m3u8'
  },

  // ==================== MUSIC ====================
  {
    id: '9xm',
    name: '9XM Music',
    category: 'Music',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/9XM.in.png',
    streamUrl: 'https://9xjio.wiseplayout.com/9XM/master.m3u8'
  },
  {
    id: '9x-jalwa',
    name: '9X Jalwa',
    category: 'Music',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/9XJalwa.in.png',
    streamUrl: 'https://wiselp.wiseplayout.com/9X_Jalwa/master.m3u8'
  },
  {
    id: 'b4u-music',
    name: 'B4U Music',
    category: 'Music',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/B4UMusic.in.png',
    streamUrl: 'https://streams.tangotv.in/B4UMUSIC/ORIGIN/index.m3u8'
  },
  {
    id: 'yrf-music',
    name: 'YRF Music',
    category: 'Music',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/YRFMusic.in.png',
    streamUrl: 'https://d14c63magvk61v.cloudfront.net/strm/channels/yrfmusic/master.m3u8'
  },
  {
    id: 'zoom',
    name: 'Zoom TV',
    category: 'Music',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/Zoom.in.png',
    streamUrl: 'https://d14c63magvk61v.cloudfront.net/strm/channels/zoom/master.m3u8'
  },
  {
    id: 'balle-balle',
    name: 'Balle Balle TV',
    category: 'Music',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/BalleBalle.in.png',
    streamUrl: 'https://mcncdndigital.com/balleballetv/index.m3u8'
  },

  // ==================== KIDS ====================
  {
    id: 'disney-channel',
    name: 'Disney Channel',
    category: 'Kids',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/DisneyChannel.in.png',
    streamUrl: 'http://66.102.126.10:8000/play/a013/index.m3u8'
  },
  {
    id: 'hungama-tv',
    name: 'Hungama TV',
    category: 'Kids',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/HungamaTV.in.png',
    streamUrl: 'http://103.185.24.134:3001/HUNGAMA/index.m3u8'
  },
  {
    id: 'super-hungama',
    name: 'Super Hungama',
    category: 'Kids',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SuperHungama.in.png',
    streamUrl: 'http://103.185.24.134:3001/SUPER-HUNGAMA/index.m3u8'
  },
  {
    id: 'nickelodeon',
    name: 'Nickelodeon',
    category: 'Kids',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/Nickelodeon.in.png',
    streamUrl: 'http://103.185.24.134:3001/NICK/index.m3u8'
  },
  {
    id: 'nick-jr',
    name: 'Nick Jr.',
    category: 'Kids',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/NickJr.in.png',
    streamUrl: 'http://103.185.24.134:3001/NICK-JR/index.m3u8'
  },
  {
    id: 'sonic',
    name: 'Sonic Gang',
    category: 'Kids',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/Sonic.in.png',
    streamUrl: 'http://103.185.24.134:3001/SONIC/index.m3u8'
  },

  // ==================== ENTERTAINMENT ====================
  {
    id: 'colors-tv',
    name: 'Colors TV',
    category: 'Entertainment',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ColorsTV.in.png',
    streamUrl: 'http://66.102.126.10:8000/play/a00a/index.m3u8'
  },
  {
    id: 'zee-tv',
    name: 'Zee TV',
    category: 'Entertainment',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ZeeTV.in.png',
    streamUrl: 'http://41.205.93.154/ZEE-TV/index.m3u8'
  },
  {
    id: 'star-plus',
    name: 'StarPlus',
    category: 'Entertainment',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/StarPlus.in.png',
    streamUrl: 'http://66.102.126.10:8000/play/a008/index.m3u8'
  },
  {
    id: 'sony-sab',
    name: 'Sony SAB',
    category: 'Entertainment',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SonySAB.in.png',
    streamUrl: 'https://cloudplay-sonyliv.pages.dev/sabhd.m3u8'
  },
  {
    id: 'sony-pal',
    name: 'Sony Pal',
    category: 'Entertainment',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SonyPal.in.png',
    streamUrl: 'https://cloudplay-sonyliv.pages.dev/pal.m3u8'
  },
  {
    id: 'dangal-tv',
    name: 'Dangal TV',
    category: 'Entertainment',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/DangalTV.in.png',
    streamUrl: 'https://live-dangal.akamaized.net/liveabr/playlist.m3u8'
  },
  {
    id: 'dangal-2',
    name: 'Dangal 2',
    category: 'Entertainment',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/Dangal2.in.png',
    streamUrl: 'https://live-dangal2.akamaized.net/liveabr/playlist.m3u8'
  },
  {
    id: 'shemaroo-tv',
    name: 'Shemaroo TV',
    category: 'Entertainment',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ShemarooTV.in.png',
    streamUrl: 'https://airtelapp.shemaroo.com/shemarootv/smil:shemarootvadp.smil/playlist.m3u8'
  },
  {
    id: 'shemaroo-umang',
    name: 'Shemaroo Umang',
    category: 'Entertainment',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/ShemarooUmang.in.png',
    streamUrl: 'https://airtelapp.shemaroo.com/shemarooumang/smil:shemarooumangadp.smil/playlist.m3u8'
  },

  // ==================== DOCUMENTARY ====================
  {
    id: 'national-geographic',
    name: 'National Geographic',
    category: 'Documentary',
    country: '🇮🇳 India',
    quality: '576p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/NationalGeographic.in.png',
    streamUrl: 'http://103.165.93.31:8095/nationalGeographic/index.m3u8'
  },
  {
    id: 'history-tv18',
    name: 'History TV18 HD',
    category: 'Documentary',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/HistoryTV18.in.png',
    streamUrl: 'https://amg01448-amg01448c16-samsung-in-3495.playouts.now.amagi.tv/ts-ap-s1-n1/playlist/amg01448-samsungindia-historychannelhindi-samsungin/playlist.m3u8'
  },
  {
    id: 'sony-bbc-earth',
    name: 'Sony BBC Earth HD',
    category: 'Documentary',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SonyBBCEarth.in.png',
    streamUrl: 'https://cloudplay-sonyliv.pages.dev/bbcearthhd.m3u8'
  },
  {
    id: 'travelxp',
    name: 'Travelxp 4K',
    category: 'Documentary',
    country: '🇮🇳 India',
    quality: '4K',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/Travelxp.in.png',
    streamUrl: 'https://amg00416-amg00416c9-samsung-in-4882.playouts.now.amagi.tv/playlist/amg00416-travelxp-travelxphd-samsungin/playlist.m3u8'
  },

  // ==================== RELIGIOUS ====================
  {
    id: 'aastha-tv',
    name: 'Aastha TV',
    category: 'Religious',
    country: '🇮🇳 India',
    quality: '720p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/AasthaTV.in.png',
    streamUrl: 'https://aasthaott.akamaized.net/110923/smil:aasthatv.smil/index.m3u8'
  },
  {
    id: 'aastha-bhajan',
    name: 'Aastha Bhajan',
    category: 'Religious',
    country: '🇮🇳 India',
    quality: '480p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/AasthaBhajan.in.png',
    streamUrl: 'https://aasthaott.akamaized.net/110923/smil:bhajan.smil/playlist.m3u8'
  },
  {
    id: 'sanskar-tv',
    name: 'Sanskar TV',
    category: 'Religious',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SanskarTV.in.png',
    streamUrl: 'https://d26idhjf0y1p2g.cloudfront.net/out/v1/cd66dd25b9774cb29943bab54bbf3e2f/index.m3u8'
  },
  {
    id: 'satsang-tv',
    name: 'Satsang TV',
    category: 'Religious',
    country: '🇮🇳 India',
    quality: '1080p',
    logo: 'https://raw.githubusercontent.com/iptv-org/iptv/master/logos/SatsangTV.in.png',
    streamUrl: 'https://d2vfwvjxwtwq1t.cloudfront.net/out/v1/6b24239d5517495b986e7705490c6e65/index.m3u8'
  }
];

const CATEGORIES = ['All', 'Movies', 'Sports', 'News', 'Entertainment', 'Music', 'Kids', 'Documentary', 'Religious', 'General'];

const FAILED_BUNDLED_CHANNEL_IDS = new Set([
  'and-tv', 'and-pictures', 'zee-cinema', 'zee-bollywood', 'zee-action', 'zee-cine-classic',
  'zee-south-flix', 'star-gold-thrills', 'sony-max', 'sony-max-2', 'sony-wah', 'sony-pix',
  'maha-movie', 'bollywood-hd', 'the-movie-club', 'star-sports-1-hindi', 'star-sports-2',
  'star-sports-2-hindi', 'sony-sports-ten-3', 'times-now-navbharat', 'yrf-music', 'zoom',
  'sony-sab', 'sony-pal', 'history-tv18', 'sony-bbc-earth', 'travelxp'
]);

const APPROVED_BUNDLED_CHANNELS = new Set([
  'B4U Movies', 'B4U Kadak', 'Goldmines', 'Manoranjan Grand', 'Shubh Cinema TV', 'DD Sports',
  'Kabaddi 24x7', 'Aaj Tak', 'ABP News', 'Republic Bharat', 'NDTV India', 'News18 India',
  'TV9 Bharatvarsh', 'Zee News', 'Zee Bharat', 'Zee Business', 'CNBC Awaaz', 'India TV',
  'Good News Today', '9XM', '9X Jalwa', 'B4U Music', 'Balle Balle', 'Disney Channel',
  'Super Hungama', 'Nickelodeon', 'Nick Jr.', 'Sonic', 'Zee TV', 'Dangal 2', 'Shemaroo TV',
  'Shemaroo Umang', 'Aastha', 'Sanskar TV', 'Satsang TV'
]);

const WORKING_CHANNELS = HINDI_CHANNELS.filter(channel =>
  !FAILED_BUNDLED_CHANNEL_IDS.has(channel.id) && APPROVED_BUNDLED_CHANNELS.has(channel.name)
);
const HINDI_PLAYLIST_URL = 'https://iptv-org.github.io/iptv/languages/hin.m3u';
const APPROVED_PLAYLIST_CHANNELS = new Set([
  '22Scope News', 'Aadinath TV', 'Aaj Ki Khabar', 'Aastha Prime 1', 'ABP Ganga', 'ABP News',
  'Adhyatm TV', 'AmarUjala', 'Anand TV', 'ANB News', 'Andy Haryana', 'Anjan TV', 'APN',
  'Apna Punjab TV', 'Argus News', 'Aryan TV National', 'Awaaz India TV', 'Awakening TV',
  'Bansal News', 'Bhakti Sagar', 'Bharat24', 'Bharat Samachar', 'Bollywood HD Russia',
  'Channel Divya', 'Cnews Bharat', 'Colors MENA HD', 'Colors Rishtey Americas', 'Darshan 24',
  'DD Arun Prabha', 'DD Haryana', 'DD Himachal Pradesh', 'DD Jharkhand', 'DD Kashir', 'DD Manipur',
  'DD National HD', 'DD News', 'DD News HD', 'Deewana HD', 'Dheeran TV', 'Disha TV', 'E 24',
  'Epic Bharat', 'Epic Bharat Digital', 'Epic Crimes', 'Epic Kids Digital', 'Epic Music',
  'Epic Music Digital', 'Epic TV Digital', 'ETV Bal Bharat', 'First India News', 'Food Food',
  'Gangaur TV', 'God Stands TV Hindi', 'Goldmines Bollywood', 'GurSikh Sabha TV', 'Hindi Khabar',
  'Hosanna TV Hindi', 'Hyder TV', 'Ind 24', 'India Daily Live', 'India TV Speed News', 'India Voice',
  'INH 24x7', 'Insync', 'Ishwar Bhakti TV', 'Jan TV', 'Janta TV', 'Jantantra TV', 'K News India',
  'Kanshi TV', 'Kashish News', 'Kaumudy TV', 'Khabar Fast', 'Khabrain Abhi Tak',
  'Lighting Lives Blessing Nations TV South Asia (LLBN)', 'Mango', 'MBC Bollywood', 'MH One Shraddha',
  'Music India', 'Namdhari', 'NDTV Madhya Pradesh Chhattisgarh', 'NDTV Rajasthan', 'NE News',
  'Network 10', 'News 1 India', 'News 11', 'News18 Bihar Jharkhand', 'News18 Delhi NCR JK',
  'News18 Madhya Pradesh/Chhattisgarh', 'News18 Punjab/Haryana/Himachal', 'News18 Rajasthan',
  'News18 Uttar Pradesh Uttarakhand', 'News 24', 'News 24 MP & Chhattisgarh', 'News Nation',
  'Paras Gold', 'Peace of Mind TV', 'Pocket Films', 'Raftaar Media', 'Republic Bharat', 'Rongeen TV',
  'Sadhna', 'Sadhna News Madhya Pradesh/Chhattisgarh', 'Sadhna Plus News', 'Sadhna TV',
  'Samachar Plus 24x7', 'Sansad TV 1 HD', 'Sansad TV 2', 'Sanskar UK', 'Sanskar USA', 'Sanskar Web TV',
  'Satsang Web TV', 'Shubh TV', 'Shubhsandesh TV', 'Soham TV', 'Sony KAL Hindi', 'South Station',
  'Sports Squad Haryana', 'Star Sports 2 HD', 'Star Sports 2 Hindi', 'Steelbird Music', 'Sudarshan News',
  'SVBC 4', 'Taaza TV', 'TBN TV', 'The Jungle Book', 'The Movie Club', 'The Movie Club +2',
  'Times Now Navbharat', 'TNP News', 'Total Bhakti', 'Utsav Bharat', 'Vedic', 'VIP News', 'VTU',
  'Weatherspy', 'WOW Kidz', 'YRF Music', 'Zee Cinema', 'Zee Cinema APAC', 'Zee Delhi NCR Haryana',
  'Zee Madhya Pradesh Chhattisgarh', 'Zee Rajasthan', 'Zee Uttar Pradesh/Uttarakhand', 'Zoom'
]);

function parsePlaylist(playlist: string): Channel[] {
  const parsedChannels: Channel[] = [];
  const lines = playlist.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const info = lines[index];
    if (!info.startsWith('#EXTINF:')) continue;

    const streamUrl = lines[index + 1]?.trim();
    if (!streamUrl || streamUrl.startsWith('#')) continue;

    const name = info.split(',').slice(1).join(',').trim();
    const group = (info.match(/group-title="([^"]+)"/)?.[1] || 'General').toLowerCase();
    const category = group.includes('movie') ? 'Movies'
      : group.includes('sport') ? 'Sports'
      : group.includes('news') ? 'News'
      : group.includes('music') ? 'Music'
      : group.includes('kid') ? 'Kids'
      : group.includes('document') ? 'Documentary'
      : group.includes('relig') ? 'Religious'
      : group.includes('entertain') ? 'Entertainment'
      : 'General';

    parsedChannels.push({
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${parsedChannels.length}`,
      name,
      category,
      country: info.includes('tvg-country="IN"') ? '🇮🇳 India' : 'International',
      quality: info.match(/tvg-resolution="([^"]+)"/)?.[1] || 'Live',
      logo: info.match(/tvg-logo="([^"]+)"/)?.[1] || '',
      streamUrl
    });
  }

  return parsedChannels;
}

function readStoredIds(key: string): string[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(stored) ? stored.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function writeStoredIds(key: string, values: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // Storage can be unavailable in private browsing or restricted environments.
  }
}

function migrateChannelIds(ids: string[]): string[] {
  return Array.from(new Set(ids
    .map(id => WORKING_CHANNELS.find(channel => channel.id === id || id.startsWith(`${channel.id}-`))?.id)
    .filter((id): id is string => Boolean(id))));
}

export default function LiveTvPage() {
  const [channels, setChannels] = useState<Channel[]>(WORKING_CHANNELS);
  const [activeChannel, setActiveChannel] = useState<Channel>(WORKING_CHANNELS[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [streamProgress, setStreamProgress] = useState(0);
  const [streamLoadTime, setStreamLoadTime] = useState(0);
  const [streamError, setStreamError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const prefetchedStreams = useRef(new Set<string>());

  const prefetchChannel = (channel: Channel) => {
    if (prefetchedStreams.current.has(channel.streamUrl)) return;

    prefetchedStreams.current.add(channel.streamUrl);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const proxiedStreamUrl = `${backendUrl}/api/stream/proxy?url=${encodeURIComponent(channel.streamUrl)}`;

    fetch(proxiedStreamUrl, { cache: 'force-cache' }).catch(() => {
      prefetchedStreams.current.delete(channel.streamUrl);
    });
  };

  const handleChannelSelect = (channel: Channel) => {
    setActiveChannel(channel);
    setRecentIds(current => {
      const next = [channel.id, ...current.filter(id => id !== channel.id)].slice(0, 12);
      writeStoredIds('live-tv-recent', next);
      return next;
    });
  };

  const toggleFavorite = (channelId: string) => {
    setFavoriteIds(current => {
      const next = current.includes(channelId)
        ? current.filter(id => id !== channelId)
        : [...current, channelId];
      writeStoredIds('live-tv-favorites', next);
      return next;
    });
  };

  useEffect(() => {
    const favorites = migrateChannelIds(readStoredIds('live-tv-favorites'));
    const recent = migrateChannelIds(readStoredIds('live-tv-recent'));
    setFavoriteIds(favorites);
    setRecentIds(recent);
    writeStoredIds('live-tv-favorites', favorites);
    writeStoredIds('live-tv-recent', recent);
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch(HINDI_PLAYLIST_URL)
      .then(response => response.ok ? response.text() : '')
      .then(playlist => {
        if (cancelled || !playlist) return;

        const existingUrls = new Set(WORKING_CHANNELS.map(channel => channel.streamUrl));
        const additionalChannels = parsePlaylist(playlist)
          .filter(channel => APPROVED_PLAYLIST_CHANNELS.has(channel.name.replace(/ \([^)]*\)$/, '').replace(/ \[[^\]]*\]$/, '')))
          .filter(channel => !existingUrls.has(channel.streamUrl));

        setChannels(current => {
          const currentUrls = new Set(current.map(channel => channel.streamUrl));
          return [...current, ...additionalChannels.filter(channel => !currentUrls.has(channel.streamUrl))];
        });
      })
      .catch(() => {
        // Keep the verified local channels when the remote catalog is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    writeStoredIds('live-tv-favorites', favoriteIds);
  }, [favoriteIds, preferencesLoaded]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    writeStoredIds('live-tv-recent', recentIds);
  }, [preferencesLoaded, recentIds]);

  useEffect(() => {
    const selectedIndex = channels.findIndex(channel => channel.id === activeChannel.id);
    if (selectedIndex === -1) return;

    const nearbyChannels = channels.slice(
      Math.max(0, selectedIndex - 3),
      Math.min(channels.length, selectedIndex + 6)
    );
    nearbyChannels.forEach(prefetchChannel);

    [...favoriteIds, ...recentIds]
      .map(id => channels.find(channel => channel.id === id))
      .filter((channel): channel is Channel => Boolean(channel))
      .forEach(prefetchChannel);
  }, [activeChannel, channels, favoriteIds, recentIds]);

  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      const matchesCategory = selectedCategory === 'All'
        || (selectedCategory === 'Favorites' && favoriteIds.includes(c.id))
        || (selectedCategory === 'Recently viewed' && recentIds.includes(c.id))
        || c.category === selectedCategory;
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            c.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [channels, favoriteIds, recentIds, selectedCategory, searchQuery]);

  // Start through the proxy for consistent CORS handling, then try the source directly.
  useEffect(() => {
    if (!channels.some(channel => channel.id === activeChannel.id) || !activeChannel.streamUrl) return;

    const video = videoRef.current;
    if (!video) return;

    const startedAt = performance.now();
    let progressTimer: number | undefined;
    let finished = false;
    const finishLoading = () => {
      if (finished) return;
      finished = true;
      setStreamProgress(100);
      setStreamLoadTime((performance.now() - startedAt) / 1000);
      setIsLoadingStream(false);
      if (progressTimer) window.clearInterval(progressTimer);
    };

    setIsLoadingStream(true);
    setStreamProgress(8);
    setStreamLoadTime(0);
    setStreamError('');
    progressTimer = window.setInterval(() => {
      setStreamProgress(progress => Math.min(progress + 3, 92));
      setStreamLoadTime((performance.now() - startedAt) / 1000);
    }, 250);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const proxiedStreamUrl = `${backendUrl}/api/stream/proxy?url=${encodeURIComponent(activeChannel.streamUrl)}`;
    let script: HTMLScriptElement | null = null;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      let usingProxy = !activeChannel.streamUrl.startsWith('https://');
      const trySource = () => {
        video.src = usingProxy ? proxiedStreamUrl : activeChannel.streamUrl;
        video.play().catch(() => {});
      };
      const handleError = () => {
        if (!usingProxy) {
          usingProxy = true;
          trySource();
        } else {
          setStreamError('This stream is unavailable. Try another channel.');
          finishLoading();
        }
      };

      video.addEventListener('error', handleError);
      video.addEventListener('canplay', finishLoading);
      trySource();

      return () => {
        video.removeEventListener('error', handleError);
        video.removeEventListener('canplay', finishLoading);
        video.pause();
        video.removeAttribute('src');
        video.load();
        if (progressTimer) window.clearInterval(progressTimer);
      };
    } else {
      script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
      let usingProxy = true;
      script.onload = () => {
        if ((window as any).Hls && (window as any).Hls.isSupported()) {
          if (hlsRef.current) {
            hlsRef.current.destroy();
          }

          const hls = new (window as any).Hls({
            enableWorker: true,
            lowLatencyMode: true,
            startLevel: -1,
            maxBufferLength: 15,
            liveSyncDurationCount: 3,
            manifestLoadingTimeOut: 8000,
            manifestLoadingMaxRetry: 1,
            levelLoadingTimeOut: 8000,
            fragLoadingTimeOut: 10000
          });

          hlsRef.current = hls;

          let usingProxy = !activeChannel.streamUrl.startsWith('https://');
          hls.loadSource(usingProxy ? proxiedStreamUrl : activeChannel.streamUrl);
          hls.attachMedia(video);

          hls.on((window as any).Hls.Events.ERROR, (_: any, data: any) => {
            if (!data.fatal) return;

            if (!usingProxy) {
              usingProxy = true;
              setStreamProgress(progress => Math.max(progress, 55));
              hls.loadSource(proxiedStreamUrl);
            } else if (data.type === (window as any).Hls.ErrorTypes.MEDIA_ERROR) {
              hls.recoverMediaError();
            } else {
              setStreamError('This stream is unavailable. Try another channel.');
              finishLoading();
            }
          });

          hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
            finishLoading();
            video.play().catch(() => {});
          });
        }
      };
      document.body.appendChild(script);
    }

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (progressTimer) window.clearInterval(progressTimer);
      script?.remove();
    };
  }, [activeChannel, channels]);

  return (
    <main className={styles.container}>
      <Navbar />

      <div className={styles.content}>
        {/* Left Section: Video Player Viewport */}
        <div className={styles.playerSection}>
          <div className={styles.header}>
            <div className={styles.titleInfo}>
              <span className={styles.liveBadge}>● LIVE STREAM</span>
              <h1 className={styles.channelTitle}>{activeChannel.name}</h1>
            </div>
            <div className={styles.metaBadges}>
              <span className={styles.badgeItem}>{activeChannel.country}</span>
              <span className={styles.badgeItem}>{activeChannel.category}</span>
              <span className={styles.badgeQuality}>{activeChannel.quality}</span>
              {streamLoadTime > 0 && !isLoadingStream && (
                <span className={styles.badgeItem}>Loaded in {streamLoadTime.toFixed(1)}s</span>
              )}
            </div>
          </div>

          <div className={styles.videoWrapper}>
            {isLoadingStream && (
              <div className={styles.loadingOverlay}>
                <div className={styles.loadingPanel}>
                  <strong>{`Loading ${activeChannel.name}`}</strong>
                  <span>{streamProgress}%</span>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressBar}
                      style={{ width: `${streamProgress}%` }}
                    />
                  </div>
                  <small className={styles.loadingDetail}>
                    {`Loading time: ${streamLoadTime.toFixed(1)} seconds`}
                  </small>
                </div>
              </div>
            )}
            {streamError && !isLoadingStream && (
              <div className={styles.loadingOverlay}>
                <div className={styles.loadingPanel}>{streamError}</div>
              </div>
            )}
            <video
              ref={videoRef}
              controls
              autoPlay
              className={styles.videoPlayer}
              poster={activeChannel.logo}
            />
          </div>
        </div>

        {/* Right Section: Sidebar Channel List & Search */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Live Channels ({filteredChannels.length})</h2>
            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Search channels..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={styles.quickFilters}>
              <button
                type="button"
                className={`${styles.quickFilter} ${selectedCategory === 'Favorites' ? styles.activeCat : ''}`}
                onClick={() => setSelectedCategory('Favorites')}
              >
                {`★ Favorites (${favoriteIds.length})`}
              </button>
              <button
                type="button"
                className={`${styles.quickFilter} ${selectedCategory === 'Recently viewed' ? styles.activeCat : ''}`}
                onClick={() => setSelectedCategory('Recently viewed')}
              >
                {`Recently viewed (${recentIds.length})`}
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className={styles.categoryRow}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`${styles.catBtn} ${selectedCategory === cat ? styles.activeCat : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Channel Cards Grid */}
          <div className={styles.channelList}>
            {filteredChannels.length > 0 ? (
              filteredChannels.map(ch => (
                <div
                  key={ch.id}
                  className={styles.channelTile}
                >
                  <div
                    className={`${styles.channelCard} ${activeChannel.id === ch.id ? styles.activeChannel : ''}`}
                    onClick={() => handleChannelSelect(ch)}
                    onMouseEnter={() => prefetchChannel(ch)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') handleChannelSelect(ch);
                    }}
                  >
                    <div className={styles.logoWrapper}>
                      <img
                        src={ch.logo}
                        alt={ch.name}
                        className={styles.channelLogo}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=200&auto=format&fit=crop';
                        }}
                      />
                    </div>
                    <span className={styles.qualityPill}>{ch.quality}</span>
                    <button
                      type="button"
                      className={`${styles.favoriteButton} ${favoriteIds.includes(ch.id) ? styles.favoriteActive : ''}`}
                      aria-label={favoriteIds.includes(ch.id) ? `Remove ${ch.name} from favorites` : `Add ${ch.name} to favorites`}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleFavorite(ch.id);
                      }}
                    >
                      {favoriteIds.includes(ch.id) ? '★' : '☆'}
                    </button>
                  </div>
                  <div className={styles.channelInfo}>
                    <div className={styles.channelName}>{ch.name}</div>
                    <span className={styles.channelTag}>{ch.country} • {ch.category}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noChannels}>No channels found for "{searchQuery}"</div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
