# DJ Studio - Personal DJ App

A personal DJ application that connects to your Spotify account, allowing you to create mixes with professional DJ features.

## Features

- **Dual Deck Interface**: Two independent decks for seamless mixing
- **Spotify Integration**: Access your entire Spotify library
- **BPM Analysis**: Automatic tempo detection for smart mixing
- **Professional Controls**: 
  - Play/Pause/Cue controls
  - Tempo adjustment
  - 3-band EQ per deck
  - Crossfader
  - Channel volume faders
- **Waveform Display**: Visual representation of tracks
- **Mix Recording**: Record and export your mixes
- **Harmonic Mixing**: Key detection for compatible track suggestions

## Setup Instructions

### 1. Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Spotify Premium account
- Supabase account

### 2. Spotify App Setup

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:3000/auth/callback` to Redirect URIs
4. Note your Client ID

### 3. Supabase Setup

1. Create a new project on [Supabase](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase_schema.sql`
3. Get your project URL and anon key from Settings > API

### 4. Environment Setup

Create a `.env.local` file and add:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_SPOTIFY_CLIENT_ID=your_spotify_client_id
```

### 5. Installation

```bash
npm install
npm start
```

## Tech Stack

- **Frontend**: React with TypeScript
- **Styling**: Tailwind CSS
- **Audio Engine**: Web Audio API + Tone.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Spotify OAuth
- **State Management**: Zustand

## Development Roadmap

- [x] Basic deck interface
- [x] Spotify OAuth integration
- [x] Database schema
- [ ] Track loading from Spotify
- [ ] Audio playback implementation
- [ ] BPM detection
- [ ] Waveform visualization
- [ ] Effects (filters, reverb, delay)
- [ ] Mix recording
- [ ] Export functionality
- [ ] Harmonic mixing suggestions

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

## License

This is a personal project for learning purposes.
