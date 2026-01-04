import { HashRouter, Routes, Route } from 'react-router-dom';
import { AdminProvider } from './contexts/AdminContext';
import Header from './components/Header';
import Footer from './components/Footer';
import AdminLoginModal from './components/AdminLoginModal';
import HomePage from './pages/HomePage';
import LegionPage from './pages/LegionPage';
import MemberDetailPage from './pages/MemberDetailPage';
import JoinPage from './pages/JoinPage';
import AdminPage from './pages/AdminPage';
import CharacterBDPage from './pages/CharacterBDPage';

function App() {
  return (
    <AdminProvider>
      <HashRouter>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/legion" element={<LegionPage />} />
            <Route path="/member/:id" element={<MemberDetailPage />} />
            <Route path="/character-bd" element={<CharacterBDPage />} />
            <Route path="/character/:serverId/:characterId" element={<MemberDetailPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
        <Footer />
        <AdminLoginModal />
      </HashRouter>
    </AdminProvider>
  );
}

export default App;
