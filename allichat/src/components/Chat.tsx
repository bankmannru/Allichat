import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  where,
  or,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Drawer,
  ListItemButton,
  useTheme,
  useMediaQuery,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Collapse,
  Link,
  Menu,
  MenuItem,
  ListItemIcon,
  Badge,
} from '@mui/material';
import {
  Send as SendIcon,
  Menu as MenuIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Campaign as CampaignIcon,
  Link as LinkIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  VolumeOff as VolumeOffIcon,
  Block as BlockIcon,
  Terminal as TerminalIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: any;
  roomId: string;
}

interface Announcement {
  id: string;
  content: string;
  link?: string;
  linkText?: string;
  fontSize?: number;
  createdAt: any;
  createdBy: string;
}

interface Room {
  id: string;
  name: string;
  type: 'group' | 'direct';
  participants: string[];
}

interface User {
  displayName: string;
  role: string;
  isOnline: boolean;
  isMuted?: boolean;
  isBanned?: boolean;
  allowedNames: string[];
}

const Chat: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [announcementLink, setAnnouncementLink] = useState('');
  const [announcementLinkText, setAnnouncementLinkText] = useState('');
  const [announcementFontSize, setAnnouncementFontSize] = useState(14);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [adminMenuAnchor, setAdminMenuAnchor] = useState<null | HTMLElement>(null);
  const [sudoDialogOpen, setSudoDialogOpen] = useState(false);
  const [sudoMessage, setSudoMessage] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    // Fetch rooms
    const roomsQuery = query(
      collection(db, 'rooms'),
      or(
        where('participants', 'array-contains', currentUser.displayName),
        where('type', '==', 'group')
      )
    );

    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
      const roomsData: Room[] = [];
      snapshot.forEach((doc) => {
        roomsData.push({ id: doc.id, ...doc.data() } as Room);
      });
      setRooms(roomsData);
      if (roomsData.length > 0 && !currentRoom) {
        setCurrentRoom(roomsData[0]);
      }
    });

    return () => unsubscribeRooms();
  }, [currentUser]);

  useEffect(() => {
    if (!currentRoom) return;

    const messagesQuery = query(
      collection(db, 'messages'),
      where('roomId', '==', currentRoom.id),
      orderBy('timestamp', 'asc')
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData: Message[] = [];
      snapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(messagesData);
    });

    return () => unsubscribeMessages();
  }, [currentRoom]);

  useEffect(() => {
    const announcementsQuery = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeAnnouncements = onSnapshot(announcementsQuery, (snapshot) => {
      const announcementsData: Announcement[] = [];
      snapshot.forEach((doc) => {
        announcementsData.push({ id: doc.id, ...doc.data() } as Announcement);
      });
      setAnnouncements(announcementsData);
    });

    return () => unsubscribeAnnouncements();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'));
    
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData: User[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ ...doc.data() } as User);
      });
      setUsers(usersData);
    });

    return () => unsubscribeUsers();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentRoom || !currentUser) return;

    const currentUserData = users.find(u => u.displayName === currentUser.displayName);
    if (currentUserData?.isBanned) {
      alert('Вы заблокированы и не можете отправлять сообщения');
      return;
    }
    if (currentUserData?.isMuted) {
      alert('Вы не можете отправлять сообщения, пока не включен звук');
      return;
    }

    try {
      await addDoc(collection(db, 'messages'), {
        content: newMessage,
        senderId: currentUser.displayName,
        timestamp: serverTimestamp(),
        roomId: currentRoom.id
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleAnnouncementSubmit = async () => {
    if (!newAnnouncement.trim() || !currentUser) return;

    try {
      await addDoc(collection(db, 'announcements'), {
        content: newAnnouncement,
        link: announcementLink || null,
        linkText: announcementLinkText || null,
        fontSize: announcementFontSize,
        createdAt: serverTimestamp(),
        createdBy: currentUser.displayName,
      });
      setNewAnnouncement('');
      setAnnouncementLink('');
      setAnnouncementLinkText('');
      setAnnouncementFontSize(14);
      setAnnouncementDialogOpen(false);
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', announcementId));
      setAnchorEl(null);
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const handleUserAction = async (action: 'mute' | 'unmute' | 'ban' | 'unban') => {
    if (!selectedUser) return;

    try {
      const userRef = doc(db, 'users', selectedUser.displayName);
      if (action === 'mute' || action === 'unmute') {
        await updateDoc(userRef, {
          isMuted: action === 'mute'
        });
      } else if (action === 'ban' || action === 'unban') {
        await updateDoc(userRef, {
          isBanned: action === 'ban'
        });
      }
      setAdminMenuAnchor(null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleSudoMessage = async () => {
    if (!sudoMessage.trim() || !selectedUser || !currentRoom) return;

    try {
      await addDoc(collection(db, 'messages'), {
        content: sudoMessage,
        senderId: selectedUser.displayName,
        timestamp: serverTimestamp(),
        roomId: currentRoom.id,
        isSudo: true
      });
      setSudoMessage('');
      setSudoDialogOpen(false);
      setAdminMenuAnchor(null);
    } catch (error) {
      console.error('Error sending sudo message:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ overflow: 'auto', mt: 8 }}>
          <List>
            <ListItem>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>Чаты</Typography>
              {currentUser?.role === 'admin' && (
                <IconButton 
                  color="primary" 
                  size="small"
                  sx={{ mr: -1 }}
                  onClick={() => setSudoDialogOpen(true)}
                >
                  <AdminIcon />
                </IconButton>
              )}
            </ListItem>
            <Divider />
            {rooms.map((room) => (
              <ListItemButton
                key={room.id}
                selected={currentRoom?.id === room.id}
                onClick={() => {
                  setCurrentRoom(room);
                  if (isMobile) setDrawerOpen(false);
                }}
              >
                {room.type === 'group' ? (
                  <GroupIcon sx={{ mr: 1 }} />
                ) : (
                  <Box sx={{ position: 'relative', mr: 1 }}>
                    <PersonIcon />
                    {users.find(u => u.displayName === room.participants.find(p => p !== currentUser?.displayName))?.isOnline && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: '#44b700',
                          border: '2px solid #fff'
                        }}
                      />
                    )}
                  </Box>
                )}
                <ListItemText primary={room.name} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {currentRoom?.name || 'Выберите чат'}
            </Typography>
            {currentUser?.role === 'admin' && (
              <IconButton 
                color="secondary" 
                onClick={() => setAnnouncementDialogOpen(true)}
                sx={{ mr: 1 }}
              >
                <CampaignIcon />
              </IconButton>
            )}
            <Button onClick={handleLogout} color="inherit">
              Выйти
            </Button>
          </Box>

          {announcements.map((announcement) => (
            <Collapse key={announcement.id} in={true}>
              <Paper
                sx={{
                  p: 1.5,
                  bgcolor: '#ff4081',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 0,
                  boxShadow: 'none',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                  <CampaignIcon sx={{ mr: 1, fontSize: '1.2rem' }} />
                  <Typography 
                    sx={{ 
                      fontSize: announcement.fontSize ? `${announcement.fontSize}px` : '14px',
                      mr: 1,
                      flexGrow: 1,
                    }}
                  >
                    {announcement.content}
                    {announcement.link && (
                      <Link
                        href={announcement.link}
                        target="_blank"
                        rel="noopener"
                        sx={{ 
                          color: 'white',
                          ml: 1,
                          textDecoration: 'underline',
                          '&:hover': { opacity: 0.8 },
                        }}
                      >
                        {announcement.linkText || 'Подробнее'}
                      </Link>
                    )}
                  </Typography>
                </Box>
                {currentUser?.role === 'admin' && (
                  <IconButton
                    size="small"
                    sx={{ color: 'white' }}
                    onClick={(e) => {
                      setSelectedAnnouncement(announcement);
                      setAnchorEl(e.currentTarget);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                )}
              </Paper>
            </Collapse>
          ))}
        </Box>

        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          <List>
            {messages.map((message) => (
              <ListItem
                key={message.id}
                sx={{
                  justifyContent: message.senderId === currentUser?.displayName ? 'flex-end' : 'flex-start',
                  px: 1,
                  py: 0.25,
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    py: 0.75,
                    px: 1.25,
                    maxWidth: '75%',
                    minWidth: '80px',
                    borderRadius: message.senderId === currentUser?.displayName 
                      ? '12px 12px 3px 12px' 
                      : '12px 12px 12px 3px',
                    bgcolor: message.senderId === currentUser?.displayName 
                      ? 'primary.main' 
                      : 'grey.100',
                    color: message.senderId === currentUser?.displayName 
                      ? 'white' 
                      : 'text.primary',
                    position: 'relative',
                    ...(message.senderId === currentUser?.displayName && {
                      '&:after': {
                        content: '""',
                        position: 'absolute',
                        width: '0',
                        height: '0',
                        bottom: '0',
                        right: '-6px',
                        borderLeft: '8px solid',
                        borderColor: 'primary.main',
                        borderTop: '8px solid transparent',
                      }
                    })
                  }}
                >
                  <Typography 
                    variant="subtitle2" 
                    sx={{ 
                      mb: 0.25,
                      fontWeight: 500,
                      fontSize: '0.7rem',
                      opacity: 0.85,
                      lineHeight: 1
                    }}
                  >
                    {message.senderId}
                  </Typography>
                  <Typography sx={{ 
                    wordBreak: 'break-word',
                    fontSize: '0.9rem',
                    lineHeight: 1.2,
                    mt: 0
                  }}>
                    {message.content}
                  </Typography>
                </Paper>
              </ListItem>
            ))}
            <div ref={messagesEndRef} />
          </List>
        </Box>

        <Box
          component="form"
          onSubmit={handleSendMessage}
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Введите сообщение..."
              variant="outlined"
              size="small"
            />
            <IconButton 
              type="submit" 
              color="primary"
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      <Dialog 
        open={announcementDialogOpen} 
        onClose={() => setAnnouncementDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Создать объявление</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Текст объявления"
            fullWidth
            multiline
            rows={2}
            value={newAnnouncement}
            onChange={(e) => setNewAnnouncement(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Ссылка (необязательно)"
            fullWidth
            value={announcementLink}
            onChange={(e) => setAnnouncementLink(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Текст ссылки (необязательно)"
            fullWidth
            value={announcementLinkText}
            onChange={(e) => setAnnouncementLinkText(e.target.value)}
          />
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>Размер текста</Typography>
            <Slider
              value={announcementFontSize}
              onChange={(_, value) => setAnnouncementFontSize(value as number)}
              min={12}
              max={24}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnnouncementDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleAnnouncementSubmit} variant="contained" color="secondary">
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem 
          onClick={() => {
            if (selectedAnnouncement) {
              handleDeleteAnnouncement(selectedAnnouncement.id);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Удалить
        </MenuItem>
      </Menu>

      <Dialog
        open={sudoDialogOpen}
        onClose={() => setSudoDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AdminIcon sx={{ mr: 1 }} color="primary" />
            <Typography variant="h6">Панель администратора</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <List>
            {users.map((user) => (
              <ListItem
                key={user.displayName}
                secondaryAction={
                  user.role !== 'admin' && (
                    <Box>
                      <IconButton
                        onClick={() => handleUserAction(user.isMuted ? 'unmute' : 'mute')}
                        color={user.isMuted ? 'error' : 'default'}
                        size="small"
                      >
                        <VolumeOffIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleUserAction(user.isBanned ? 'unban' : 'ban')}
                        color={user.isBanned ? 'error' : 'default'}
                        size="small"
                        sx={{ mx: 1 }}
                      >
                        <BlockIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => {
                          setSelectedUser(user);
                          setSudoDialogOpen(false);
                          setTimeout(() => {
                            setSudoDialogOpen(true);
                          }, 100);
                        }}
                        size="small"
                      >
                        <TerminalIcon />
                      </IconButton>
                    </Box>
                  )
                }
              >
                <ListItemIcon>
                  <Box sx={{ position: 'relative' }}>
                    {user.role === 'admin' ? (
                      <AdminIcon color="primary" />
                    ) : (
                      <PersonIcon />
                    )}
                    {user.isOnline && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: '#44b700',
                          border: '2px solid #fff'
                        }}
                      />
                    )}
                  </Box>
                </ListItemIcon>
                <ListItemText 
                  primary={user.displayName}
                  secondary={
                    user.isBanned ? 'Заблокирован' : 
                    user.isMuted ? 'Без звука' : 
                    user.isOnline ? 'В сети' : 'Не в сети'
                  }
                  secondaryTypographyProps={{
                    sx: {
                      color: user.isBanned ? 'error.main' : 
                             user.isMuted ? 'warning.main' : 
                             user.isOnline ? 'success.main' : 'text.secondary'
                    }
                  }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSudoDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        fullWidth
        maxWidth="sm"
      >
        {selectedUser && (
          <>
            <DialogTitle>
              Написать от имени {selectedUser.displayName}
            </DialogTitle>
            <DialogContent>
              <TextField
                autoFocus
                margin="dense"
                label="Сообщение"
                fullWidth
                multiline
                rows={3}
                value={sudoMessage}
                onChange={(e) => setSudoMessage(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedUser(null)}>
                Отмена
              </Button>
              <Button onClick={handleSudoMessage} variant="contained" color="primary">
                Отправить
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Chat; 