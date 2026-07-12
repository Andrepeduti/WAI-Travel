import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { UserPlus, MoreHorizontal, Pencil, Trash2, X, Crown, Shield, Eye, Link, Copy, Share2, Search } from 'lucide-react';
import { SuccessToast } from '@/components/travel/SuccessToast';
import { BackButton } from '@/components/ui/BackButton';

interface Member {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  role: 'owner' | 'editor' | 'viewer';
  avatar?: string;
}

interface InvitedFriend {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'pending' | 'accepted';
}

interface ManageMembersScreenProps {
  onBack: () => void;
  invitedFriends?: InvitedFriend[];
}

const roleConfig = {
  owner: { label: 'Proprietário', icon: Crown, color: '#4A6B1A', bg: '#E8F5CC' },
  editor: { label: 'Editor', icon: Pencil, color: '#1E40AF', bg: '#DBEAFE' },
  viewer: { label: 'Visualizador', icon: Eye, color: '#374151', bg: '#F3F4F6' }
};

const memberColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// Members are now initialized dynamically from invitedFriends prop

export function ManageMembersScreen({ onBack, invitedFriends = [] }: ManageMembersScreenProps) {
  const [members, setMembers] = useState<Member[]>(() => {
    const membersFromFriends = invitedFriends.map((f, i) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      initials: getInitials(f.name),
      color: memberColors[(i + 1) % memberColors.length],
      role: 'editor' as const,
      avatar: f.avatar,
    }));
    return [
      { id: 'owner', name: 'Você', email: '', initials: 'VC', color: '#3B82F6', role: 'owner' as const },
      ...membersFromFriends,
    ];
  });
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Member['role']>('editor');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: '', description: '' });
  const [showRoleSheet, setShowRoleSheet] = useState<string | null>(null);
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetRole, setSheetRole] = useState<'editor' | 'viewer'>('editor');
  const filteredMembers = members.filter((member) =>
  member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const showToast = (title: string, description: string) => {
    setToastMessage({ title, description });
    setToastVisible(true);
  };

  const handleAddMember = () => {
    if (!newName.trim()) return;
    const member: Member = {
      id: Date.now().toString(),
      name: newName.trim(),
      email: newEmail.trim(),
      initials: getInitials(newName),
      color: memberColors[members.length % memberColors.length],
      role: newRole
    };
    setMembers([...members, member]);
    resetForm();
    setShowAddMember(false);
    showToast('Membro adicionado!', `${member.name} agora faz parte do roteiro`);
  };

  const handleEditMember = () => {
    if (!editingMember || !newName.trim()) return;
    setMembers(members.map((m) => m.id === editingMember.id ?
    { ...m, name: newName.trim(), email: newEmail.trim(), initials: getInitials(newName), role: newRole } :
    m
    ));
    showToast('Membro editado!', `${newName.trim()} foi atualizado`);
    resetForm();
    setEditingMember(null);
  };

  const handleDeleteMember = (id: string) => {
    const member = members.find((m) => m.id === id);
    setMembers(members.filter((m) => m.id !== id));
    setMenuOpen(null);
    showToast('Membro removido!', `${member?.name || 'Membro'} foi removido do roteiro`);
  };

  const handleChangeRole = (id: string, role: Member['role']) => {
    const member = members.find((m) => m.id === id);
    setMembers(members.map((m) => m.id === id ? { ...m, role } : m));
    setShowRoleSheet(null);
    showToast('Permissão alterada!', `${member?.name} agora é ${roleConfig[role].label.toLowerCase()}`);
  };

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewRole('editor');
  };

  return (
    <div className="min-h-screen pb-8" style={{ fontFamily: 'var(--font-family-primary)', background: '#F2F2F2' }}>
      {/* Header */}
      <div className="px-4 pb-4 flex items-center gap-3" style={{ paddingTop: 'calc(max(16px, env(safe-area-inset-top)) + 12px)' }}>
        <BackButton onClick={onBack} />
        <div className="flex-1">
          <h1 className="text-[20px] font-bold text-foreground">Participantes</h1>
          
        </div>
        <button
          onClick={() => setShowInviteSheet(true)}
          className="flex items-center gap-2 text-[14px] font-semibold text-foreground active:opacity-70 transition-opacity">
          <UserPlus size={18} strokeWidth={2.2} />
          Convidar
        </button>
      </div>

      {/* Search */}
      <div className="px-4 mt-5">
        <div className="relative">
          
          




          
          
        </div>
      </div>

      {/* Members list */}
      <div className="px-4 space-y-3 mt-4">
        {filteredMembers.length === 0 ?
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search size={40} className="text-muted-foreground/40 mb-3" />
            <p className="text-[15px] font-semibold text-foreground">Nenhum membro encontrado</p>
            <p className="text-[13px] text-muted-foreground mt-1">Tente buscar por outro nome ou email</p>
          </div> :
        filteredMembers.map((member) => {
          const RoleIcon = roleConfig[member.role].icon;
          return (
            <div key={member.id} className="bg-card rounded-2xl p-4 flex items-center gap-3.5 relative" style={{ boxShadow: '0 2px 16px rgba(0, 0, 0, 0.07)' }}>
              {member.avatar ?
              <img
                src={member.avatar}
                alt={member.name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0" /> :


              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                style={{ backgroundColor: member.color }}>
                
                  {member.initials}
                </div>
              }
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-semibold text-foreground truncate" style={{ color: '#171F2C' }}>{member.name}</span>
                </div>
                <span className="text-[12px] text-muted-foreground block truncate mt-0.5">{member.email}</span>
              </div>
              <button
                onClick={() => {if (member.role !== 'owner') {setSheetRole(member.role as 'editor' | 'viewer');setMenuOpen(member.id);}}}
                className="flex items-center gap-1.5 flex-shrink-0"
                style={{ color: '#141530' }}>
                <RoleIcon size={13} />
                <span className="text-[12px] font-semibold">
                  {roleConfig[member.role].label}
                </span>
              </button>
              {member.role !== 'owner' &&
              <button
                onClick={() => {setSheetRole(member.role as 'editor' | 'viewer');setMenuOpen(member.id);}}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                  <MoreHorizontal size={16} className="text-muted-foreground" />
                </button>
              }
            </div>);

        })}
      </div>

      {/* Member Actions Bottom Sheet */}
      {menuOpen && (() => {
        const member = members.find((m) => m.id === menuOpen);
        if (!member) return null;

        return (
          <>
            <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setMenuOpen(null)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
              <div className="bg-card rounded-t-3xl w-full w-full px-5 pt-3 animate-in slide-in-from-bottom duration-300 flex flex-col">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-1 rounded-full bg-muted" />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[17px] font-bold text-foreground">Editar permissão</p>
                    
                  </div>
                  <button
                    onClick={() => setMenuOpen(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors">
                    
                    <X size={20} className="text-muted-foreground" />
                  </button>
                </div>

                {/* Role selection */}
                
                <div className="flex gap-2 mb-5">
                  <button
                    onClick={() => setSheetRole('editor')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors"
                    style={sheetRole === 'editor' ?
                    { background: '#1A1C40', color: '#fff' } :
                    { background: '#F2F2F2', color: '#555' }
                    }>
                    
                    <Pencil size={14} />
                    Editor
                  </button>
                  <button
                    onClick={() => setSheetRole('viewer')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors"
                    style={sheetRole === 'viewer' ?
                    { background: '#1A1C40', color: '#fff' } :
                    { background: '#F2F2F2', color: '#555' }
                    }>
                    
                    <Eye size={14} />
                    Visualizador
                  </button>
                </div>



                {/* Remove */}
                <button
                  onClick={() => {handleDeleteMember(member.id);setMenuOpen(null);}}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[14px] font-medium text-destructive active:bg-destructive/10 transition-colors">
                  
                  <Trash2 size={18} />
                  Remover participante
                </button>

                {/* Save button */}
                <div className="px-0 pt-4" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}>
                  <button
                    onClick={() => {
                      setMembers(members.map((m) => m.id === member.id ? { ...m, role: sheetRole } : m));
                      setMenuOpen(null);
                      showToast('Permissão alterada', `${member.name} agora é ${sheetRole === 'editor' ? 'Editor' : 'Visualizador'}`);
                    }}
                    className="w-full h-[41px] rounded-[16px] flex items-center justify-center font-semibold text-[15px] transition-colors active:opacity-90"
                    style={{ background: '#9DCC36', color: '#141530' }}>
                    
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </>);

      })()}

      {/* Add/Edit member sheet */}
      {(showAddMember || editingMember) &&
      <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => {setShowAddMember(false);setEditingMember(null);}} />
          <div
          className="relative w-full w-full bg-card rounded-t-3xl p-6 pb-8"
          style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}>
          
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[18px] font-bold text-foreground">
                {editingMember ? 'Editar membro' : 'Convidar membro'}
              </h2>
              <button
              onClick={() => {setShowAddMember(false);setEditingMember(null);}}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              
                <X size={18} className="text-foreground" />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-[13px] font-medium text-foreground block mb-1.5">Nome</label>
              <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Maria Silva"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
            
            </div>

            <div className="mb-4">
              <label className="text-[13px] font-medium text-foreground block mb-1.5">E-mail</label>
              <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Ex: maria@email.com"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
            
            </div>

            <div className="mb-6">
              <label className="text-[13px] font-medium text-foreground block mb-2">Permissão</label>
              <div className="flex gap-2">
                {(['editor', 'viewer'] as const).map((role) => {
                const config = roleConfig[role];
                const RIcon = config.icon;
                return (
                  <button
                    key={role}
                    onClick={() => setNewRole(role)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                    newRole === role ? 'bg-foreground text-background' : 'bg-muted text-foreground'}`
                    }>
                    
                      <RIcon size={14} />
                      {config.label}
                    </button>);

              })}
              </div>
            </div>

            <button
            onClick={editingMember ? handleEditMember : handleAddMember}
            disabled={!newName.trim()}
            className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] disabled:bg-[#D1D5DB] disabled:text-white">
            
              {editingMember ? 'Salvar' : 'Convidar'}
            </button>
          </div>
        </div>
      }

      {/* Change role sheet */}
      {showRoleSheet &&
      <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowRoleSheet(null)} />
          <div
          className="relative w-full w-full bg-card rounded-t-3xl p-6 pb-8"
          style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}>
          
            <div className="flex justify-center pt-0 pb-3">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
            <h2 className="text-[18px] font-bold text-foreground mb-4">Alterar permissão</h2>
            <div className="space-y-2">
              {(['editor', 'viewer'] as const).map((role) => {
              const config = roleConfig[role];
              const RIcon = config.icon;
              const member = members.find((m) => m.id === showRoleSheet);
              const isActive = member?.role === role;
              return (
                <button
                  key={role}
                  onClick={() => handleChangeRole(showRoleSheet, role)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${
                  isActive ? 'bg-primary/5 border border-primary/20' : 'bg-muted/50 border border-transparent'}`
                  }>
                  
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <RIcon size={18} style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-[14px] font-medium text-foreground block">{config.label}</span>
                      <span className="text-[12px] text-muted-foreground">
                        {role === 'editor' ? 'Pode editar o roteiro' : 'Apenas visualização'}
                      </span>
                    </div>
                    {isActive &&
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                  }
                  </button>);

            })}
            </div>
          </div>
        </div>
      }

      {/* Invite sheet */}
      {showInviteSheet &&
      <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInviteSheet(false)} />
          <div
          className="relative w-full w-full bg-card rounded-t-3xl p-6 pb-8"
          style={{ animation: 'slideUpSheet 0.35s cubic-bezier(0.32, 0.72, 0, 1)' }}>
          
            <div className="flex justify-center pt-0 pb-3">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
            <h2 className="text-[18px] font-bold text-foreground mb-1">Convidar pessoas</h2>
            <p className="text-[13px] text-muted-foreground mb-5">Escolha como quer convidar</p>

            {/* Share links */}
            <div className="space-y-2 mb-5">
              <button
              onClick={() => {
                const link = `${window.location.origin}/invite/edit-abc123`;
                navigator.clipboard.writeText(link);
                setShowInviteSheet(false);
                showToast('Link copiado!', 'Link de edição copiado para a área de transferência');
              }}
              className="w-full flex items-center gap-3.5 p-4 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors">
              
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
                  <Pencil size={18} style={{ color: '#3B82F6' }} />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[14px] font-semibold text-foreground block">Link de edição</span>
                  <span className="text-[12px] text-muted-foreground">Quem acessar poderá editar o roteiro</span>
                </div>
                <Copy size={16} className="text-muted-foreground flex-shrink-0" />
              </button>

              <button
              onClick={() => {
                const link = `${window.location.origin}/invite/view-abc123`;
                navigator.clipboard.writeText(link);
                setShowInviteSheet(false);
                showToast('Link copiado!', 'Link de visualização copiado para a área de transferência');
              }}
              className="w-full flex items-center gap-3.5 p-4 rounded-xl bg-muted/50 border border-border hover:bg-muted transition-colors">
              
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F3F4F6' }}>
                  <Eye size={18} style={{ color: '#6B7280' }} />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[14px] font-semibold text-foreground block">Link de visualização</span>
                  <span className="text-[12px] text-muted-foreground">Quem acessar poderá apenas ver</span>
                </div>
                <Copy size={16} className="text-muted-foreground flex-shrink-0" />
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[12px] text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Add manually */}
            <button
            onClick={() => {
              setShowInviteSheet(false);
              resetForm();
              setShowAddMember(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-border text-[14px] font-medium text-foreground hover:bg-muted/30 transition-colors">
            
              <UserPlus size={18} />
              Adicionar manualmente
            </button>
          </div>
        </div>
      }

      <SuccessToast
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
        title={toastMessage.title}
        description={toastMessage.description} />
      
    </div>);

}