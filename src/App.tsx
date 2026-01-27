import { HashRouter, Routes, Route } from 'react-router-dom';
import { AdminProvider } from './contexts/AdminContext';
import Header from './components/Header';
import Footer from './components/Footer';
import AdminLoginModal from './components/AdminLoginModal';
import CharacterBDPage from './pages/CharacterBDPage';
import ToolsPage from './pages/ToolsPage';
import ItemsPage from './pages/ItemsPage';
import JoinLegionPage from './pages/JoinLegionPage';
import LegionPage from './pages/LegionPage';
import MemberDetailPage from './pages/MemberDetailPage';
import AdminPage from './pages/AdminPage';

function AppRoutes() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<CharacterBDPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/join-legion" element={<JoinLegionPage />} />
          <Route path="/legion" element={<LegionPage />} />
          <Route path="/member/:id" element={<MemberDetailPage />} />
          <Route path="/character/:serverId/:characterId" element={<MemberDetailPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
      <Footer />
      <AdminLoginModal />
    </>
  );
}

function App() {
  return (
    <AdminProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AdminProvider>
  );
}

export default App;
