import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreatorDashboardScreen } from '@/components/screens/CreatorDashboardScreen';
import { EditProfileScreen } from '@/components/screens/EditProfileScreen';
import { SalesSummaryScreen } from '@/components/screens/SalesSummaryScreen';

type SubScreen = 'main' | 'edit' | 'sales';

const CreatorPage = () => {
  const navigate = useNavigate();
  const [subScreen, setSubScreen] = useState<SubScreen>('main');

  const content = (() => {
    if (subScreen === 'edit') {
      return <EditProfileScreen onBack={() => setSubScreen('main')} onSave={() => setSubScreen('main')} />;
    }

    if (subScreen === 'sales') {
      return <SalesSummaryScreen onBack={() => setSubScreen('main')} />;
    }

    return (
      <CreatorDashboardScreen
        onBack={() => navigate('/home')}
        onEditProfile={() => setSubScreen('edit')}
        onViewSales={() => setSubScreen('sales')}
      />
    );
  })();

  return (
    <div className="min-h-screen bg-muted flex items-start justify-center">
      <div className="w-full max-w-[430px] bg-background min-h-screen shadow-2xl overflow-x-clip">
        {content}
      </div>
    </div>
  );
};

export default CreatorPage;
