import { AudioProvider } from './context/AudioContext';
import { useAudioPlayerSetup } from './hooks/useAudioPlayer';
import { MainLayout } from './components/Layout/MainLayout';
import './styles/global.css';
import './styles/skeuomorphic.css';

/**
 * Inner component that sets up audio player effects.
 * Must be inside AudioProvider to access the audio element ref.
 */
function AppInner() {
  useAudioPlayerSetup();
  return <MainLayout />;
}

export default function App() {
  return (
    <AudioProvider>
      <AppInner />
    </AudioProvider>
  );
}
