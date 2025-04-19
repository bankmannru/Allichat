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
  getDoc,
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
  CircularProgress,
  ListSubheader,
  Chip,
  InputAdornment,
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
  Add as AddIcon,
  Image as ImageIcon,
  AttachFile as AttachFileIcon,
  Edit as EditIcon,
  ExitToApp as ExitToAppIcon,
  GroupAdd as GroupAddIcon,
  Reply as ReplyIcon,
  Close as CloseIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  Check as CheckIcon,
  DoneAll as DoneAllIcon,
  Search as SearchIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: any;
  roomId: string;
  image?: string; // Base64 encoded image
  isImage?: boolean;
  edited?: boolean;
  editedAt?: any;
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
  };
  reactions?: {
    [key: string]: string[]; // emoji: userIds[]
  };
  status: 'sent' | 'delivered' | 'read';
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
  createdAt?: any;
  createdBy?: string;
  emoji?: string; // Emoji avatar for the group
  isPublic?: boolean; // Whether the group is public (can be joined by anyone)
}

interface User {
  id: string;
  displayName: string;
  role: string;
  isOnline: boolean;
  isMuted?: boolean;
  isBanned?: boolean;
  allowedNames: string[];
  lastSeen?: any;
  isTyping?: { [roomId: string]: boolean };
}

interface Subteam {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdBy: string;
  createdAt: any;
  color?: string;
}

const Chat: React.FC = () => {
  const { currentUser, logout, setCurrentUser } = useAuth();
  const navigate = useNavigate();
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
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [editMessageDialogOpen, setEditMessageDialogOpen] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState<Message | null>(null);
  const [editedMessageContent, setEditedMessageContent] = useState('');
  const [messageMenuAnchor, setMessageMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [newGroupDialogOpen, setNewGroupDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('👥');
  const [newGroupIsPublic, setNewGroupIsPublic] = useState(false);
  const [joinGroupDialogOpen, setJoinGroupDialogOpen] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<Room[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [subteams, setSubteams] = useState<Subteam[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const roomsQuery = query(
      collection(db, 'rooms'),
      or(
        where('participants', 'array-contains', currentUser.displayName),
        where('isPublic', '==', true),
        where('name', '==', 'Общий чат') // Always fetch the global chat
      )
    );

    const unsubscribeRooms = onSnapshot(roomsQuery, (snapshot) => {
      const roomsData: Room[] = [];
      snapshot.forEach((doc) => {
        const room = { id: doc.id, ...doc.data() } as Room;
        // Include room if:
        // 1. User is a participant, or
        // 2. It's a public group they haven't joined, or
        // 3. It's the global chat
        if (room.participants.includes(currentUser.displayName) || 
            (room.isPublic && !room.participants.includes(currentUser.displayName)) ||
            room.name === 'Общий чат') {
          roomsData.push(room);
        }
      });
      setRooms(roomsData);
      // Only set current room if user is a participant
      if (roomsData.length > 0 && !currentRoom) {
        const userRooms = roomsData.filter(room => room.participants.includes(currentUser.displayName));
        if (userRooms.length > 0) {
          setCurrentRoom(userRooms[0]);
        }
      }
    });

    return () => unsubscribeRooms();
  }, [currentUser]);

  useEffect(() => {
    if (!currentRoom || !currentUser) return;

    // Only fetch messages if user is a participant
    if (!currentRoom.participants.includes(currentUser.displayName)) {
      setMessages([]);
      return;
    }

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
  }, [currentRoom, currentUser]);

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

  // Fetch available public groups
  useEffect(() => {
    if (!currentUser) return;

    const publicGroupsQuery = query(
      collection(db, 'rooms'),
      where('type', '==', 'group'),
      where('isPublic', '==', true)
    );

    const unsubscribePublicGroups = onSnapshot(publicGroupsQuery, (snapshot) => {
      const groupsData: Room[] = [];
      snapshot.forEach((doc) => {
        const room = { id: doc.id, ...doc.data() } as Room;
        // Only include groups the user is not already a participant in
        if (!room.participants.includes(currentUser.displayName)) {
          groupsData.push(room);
        }
      });
      setAvailableGroups(groupsData);
    });

    return () => unsubscribePublicGroups();
  }, [currentUser]);

  // Fetch subteams
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'subteams'),
      where('members', 'array-contains', currentUser.displayName)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subteamsData: Subteam[] = [];
      snapshot.forEach((doc) => {
        subteamsData.push({ id: doc.id, ...doc.data() } as Subteam);
      });
      setSubteams(subteamsData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Update typing status
  const updateTypingStatus = async (isTyping: boolean) => {
    if (!currentUser || !currentRoom) return;

    try {
      const userRef = doc(db, 'users', currentUser.displayName);
      await updateDoc(userRef, {
        [`isTyping.${currentRoom.id}`]: isTyping
      });
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  };

  // Handle typing indicator
  useEffect(() => {
    if (!newMessage) {
      updateTypingStatus(false);
      return;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    updateTypingStatus(true);

    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 3000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [newMessage]);

  // Update message status
  useEffect(() => {
    if (!currentRoom || !currentUser) return;

    const unreadMessages = messages.filter(
      msg => msg.senderId !== currentUser.displayName && msg.status !== 'read'
    );

    if (unreadMessages.length > 0) {
      unreadMessages.forEach(async (msg) => {
        const messageRef = doc(db, 'messages', msg.id);
        await updateDoc(messageRef, { status: 'read' });
      });
    }
  }, [messages, currentRoom, currentUser]);

  // Search messages
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results = messages.filter(msg => 
      msg.content.toLowerCase().includes(query.toLowerCase()) ||
      msg.senderId.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
  };

  // Add reaction to message
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser) return;

    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const message = messageDoc.data() as Message;
        const reactions = message.reactions || {};
        
        if (!reactions[emoji]) {
          reactions[emoji] = [];
        }
        
        const userIndex = reactions[emoji].indexOf(currentUser.displayName);
        if (userIndex === -1) {
          reactions[emoji].push(currentUser.displayName);
        } else {
          reactions[emoji].splice(userIndex, 1);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        }
        
        await updateDoc(messageRef, { reactions });
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !newImage) || !currentRoom || !currentUser) return;

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
        roomId: currentRoom.id,
        image: newImage || null,
        isImage: !!newImage
      });
      setNewMessage('');
      setNewImage(null);
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
      const userRef = doc(db, 'users', selectedUser.id);
      const updates: Partial<User> = {};

      switch (action) {
        case 'mute':
          updates.isMuted = true;
          break;
        case 'unmute':
          updates.isMuted = false;
          break;
        case 'ban':
          updates.isBanned = true;
          break;
        case 'unban':
          updates.isBanned = false;
          break;
      }

      await updateDoc(userRef, updates);

      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id ? { ...user, ...updates } : user
      ));

      setAdminMenuAnchor(null);
      setSelectedUser(null);
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

  const createPrivateChat = async (recipientName: string) => {
    if (!currentUser) return;

    // Check if chat already exists
    const existingChat = rooms.find(room => 
      room.type === 'direct' && 
      room.participants.includes(currentUser.displayName) && 
      room.participants.includes(recipientName)
    );

    if (existingChat) {
      setCurrentRoom(existingChat);
      setNewChatDialogOpen(false);
      if (isMobile) setDrawerOpen(false);
      return;
    }

    try {
      const chatRoom: Omit<Room, 'id'> = {
        name: recipientName,
        type: 'direct' as const,
        participants: [currentUser.displayName, recipientName],
        createdAt: serverTimestamp(),
        createdBy: currentUser.displayName
      };

      const docRef = await addDoc(collection(db, 'rooms'), chatRoom);
      setNewChatDialogOpen(false);
      setCurrentRoom({ id: docRef.id, ...chatRoom });
      if (isMobile) setDrawerOpen(false);
    } catch (error) {
      console.error('Error creating private chat:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Размер файла не должен превышать 5MB');
      return;
    }

    setIsUploading(true);
    
    // Create a new image object
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = () => {
      // Create canvas for compression
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        setIsUploading(false);
        return;
      }
      
      // Calculate new dimensions (max 800px width/height)
      let width = img.width;
      let height = img.height;
      
      if (width > 800 || height > 800) {
        if (width > height) {
          height = Math.round((height * 800) / width);
          width = 800;
        } else {
          width = Math.round((width * 800) / height);
          height = 800;
        }
      }
      
      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;
      
      // Draw image on canvas with new dimensions
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 with compression
      const base64Image = canvas.toDataURL('image/jpeg', 0.7);
      
      setNewImage(base64Image);
      setIsUploading(false);
    };
    
    img.onerror = () => {
      setIsUploading(false);
      alert('Ошибка при загрузке изображения');
    };
  };

  const handleImageClick = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setImagePreviewOpen(true);
  };

  const removeImage = () => {
    setNewImage(null);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteDoc(doc(db, 'messages', messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleEditMessage = (message: Message) => {
    setMessageToEdit(message);
    setEditedMessageContent(message.content);
    setEditMessageDialogOpen(true);
  };

  const handleSaveEditedMessage = async () => {
    if (!messageToEdit || !editedMessageContent.trim()) return;

    try {
      const messageRef = doc(db, 'messages', messageToEdit.id);
      await updateDoc(messageRef, {
        content: editedMessageContent,
        edited: true,
        editedAt: serverTimestamp()
      });
      setEditMessageDialogOpen(false);
      setMessageToEdit(null);
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleMessageClick = (event: React.MouseEvent<HTMLElement>, message: Message) => {
    // Allow all users to click on messages to open the menu
    setSelectedMessage(message);
    setMessageMenuAnchor(event.currentTarget);
  };

  const handleMessageMenuClose = () => {
    setMessageMenuAnchor(null);
    setSelectedMessage(null);
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || !currentUser) return;

    try {
      const groupRoom: Omit<Room, 'id'> = {
        name: newGroupName,
        type: 'group' as const,
        participants: [currentUser.displayName], // Creator is automatically a participant
        createdAt: serverTimestamp(),
        createdBy: currentUser.displayName,
        emoji: newGroupEmoji,
        isPublic: newGroupIsPublic
      };

      const docRef = await addDoc(collection(db, 'rooms'), groupRoom);
      setNewGroupDialogOpen(false);
      setNewGroupName('');
      setNewGroupEmoji('👥');
      setNewGroupIsPublic(false);
      setCurrentRoom({ id: docRef.id, ...groupRoom });
      if (isMobile) setDrawerOpen(false);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const joinGroup = async (roomId: string) => {
    if (!currentUser) return;

    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);
      
      if (roomDoc.exists()) {
        const roomData = roomDoc.data() as Room;
        const updatedParticipants = [...roomData.participants, currentUser.displayName];
        
        await updateDoc(roomRef, {
          participants: updatedParticipants
        });
        
        setJoinGroupDialogOpen(false);
        alert(`Вы присоединились к группе ${roomData.name}`);
      }
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const leaveGroup = async (roomId: string) => {
    if (!currentUser || !currentRoom) return;

    try {
      const roomRef = doc(db, 'rooms', roomId);
      const roomDoc = await getDoc(roomRef);
      
      if (roomDoc.exists()) {
        const roomData = roomDoc.data() as Room;
        const updatedParticipants = roomData.participants.filter(
          (participant: string) => participant !== currentUser.displayName
        );
        
        // If the user is the creator and the last person leaving, delete the group
        if (roomData.createdBy === currentUser.displayName && updatedParticipants.length === 0) {
          await deleteDoc(roomRef);
          alert(`Группа ${roomData.name} удалена`);
        } else {
          await updateDoc(roomRef, {
            participants: updatedParticipants
          });
          alert(`Вы покинули группу ${roomData.name}`);
        }
        
        // Set current room to another room if available
        const otherRooms = rooms.filter(room => room.id !== roomId);
        if (otherRooms.length > 0) {
          setCurrentRoom(otherRooms[0]);
        } else {
          setCurrentRoom(null);
        }
      }
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  // Function to get subteam for a user
  const getUserSubteam = (username: string) => {
    return subteams.find(subteam => subteam.members.includes(username));
  };

  return (
    <Container maxWidth={false} sx={{ height: '100vh', p: 0 }}>
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
                <IconButton 
                  color="primary"
                  size="small"
                  onClick={() => setNewChatDialogOpen(true)}
                  sx={{ mr: 1 }}
                >
                  <AddIcon />
                </IconButton>
                {currentUser?.role === 'admin' && (
                  <>
                    <IconButton 
                      color="primary" 
                      size="small"
                      sx={{ mr: 1 }}
                      onClick={() => setNewGroupDialogOpen(true)}
                    >
                      <GroupIcon />
                    </IconButton>
                    <IconButton 
                      color="primary" 
                      size="small"
                      sx={{ mr: -1 }}
                      onClick={() => setSudoDialogOpen(true)}
                    >
                      <AdminIcon />
                    </IconButton>
                  </>
                )}
              </ListItem>
              <Divider />
              <List subheader={
                <ListSubheader component="div">
                  Мои чаты
                </ListSubheader>
              }>
                {rooms
                  .filter(room => room.participants.includes(currentUser?.displayName || ''))
                  .map((room) => (
                    <ListItemButton
                      key={room.id}
                      selected={currentRoom?.id === room.id}
                      onClick={() => {
                        setCurrentRoom(room);
                        if (isMobile) setDrawerOpen(false);
                      }}
                    >
                      {room.type === 'group' ? (
                        <Box sx={{ mr: 1, fontSize: '1.5rem' }}>
                          {room.emoji || '👥'}
                        </Box>
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
                      <ListItemText 
                        primary={room.name || room.participants.find(p => p !== currentUser?.displayName)} 
                      />
                      {room.type === 'group' && room.name !== 'Общий чат' && (
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            leaveGroup(room.id);
                          }}
                          sx={{ ml: 1 }}
                        >
                          <ExitToAppIcon fontSize="small" />
                        </IconButton>
                      )}
                    </ListItemButton>
                  ))}
              </List>

              {/* Available groups section */}
              {rooms
                .filter(room => 
                  (room.type === 'group' && 
                  ((room.isPublic && !room.participants.includes(currentUser?.displayName || '')) ||
                   (room.name === 'Общий чат' && !room.participants.includes(currentUser?.displayName || ''))))
                )
                .length > 0 && (
                <List
                  subheader={
                    <ListSubheader component="div" sx={{ mt: 2 }}>
                      Доступные группы
                    </ListSubheader>
                  }
                >
                  {rooms
                    .filter(room => 
                      (room.type === 'group' && 
                      ((room.isPublic && !room.participants.includes(currentUser?.displayName || '')) ||
                       (room.name === 'Общий чат' && !room.participants.includes(currentUser?.displayName || ''))))
                    )
                    .map((room) => (
                      <ListItemButton
                        key={room.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          py: 1
                        }}
                      >
                        <Box sx={{ mr: 1, fontSize: '1.5rem' }}>
                          {room.emoji || '👥'}
                        </Box>
                        <ListItemText 
                          primary={room.name}
                          secondary={`${room.participants.length} участников`}
                          sx={{ flex: 1 }}
                        />
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            joinGroup(room.id);
                          }}
                          sx={{ 
                            ml: 1,
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.04)'
                            }
                          }}
                        >
                          <GroupAddIcon />
                        </IconButton>
                      </ListItemButton>
                    ))}
                </List>
              )}
              <ListItemButton onClick={() => navigate('/subteams')}>
                <ListItemIcon>
                  <GroupIcon />
                </ListItemIcon>
                <ListItemText primary="Подгруппы" />
              </ListItemButton>
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
              <IconButton
                color="inherit"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                sx={{ mr: 1 }}
              >
                <SearchIcon />
              </IconButton>
            </Box>

            {isSearchOpen && (
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Поиск сообщений..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
                {searchResults.length > 0 && (
                  <List sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                    {searchResults.map((msg) => (
                      <ListItemButton
                        key={msg.id}
                        onClick={() => {
                          const element = document.getElementById(`message-${msg.id}`);
                          element?.scrollIntoView({ behavior: 'smooth' });
                          setIsSearchOpen(false);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                      >
                        <ListItemText
                          primary={msg.senderId}
                          secondary={msg.content}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                )}
              </Box>
            )}
          </Box>

          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
            <List>
              {messages.map((message) => {
                const userSubteam = getUserSubteam(message.senderId);
                return (
                  <ListItem
                    key={message.id}
                    id={`message-${message.id}`}
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
                        cursor: (currentUser?.role === 'admin' || message.senderId === currentUser?.displayName) ? 'pointer' : 'default',
                        borderLeft: userSubteam ? `4px solid ${userSubteam.color || '#2196f3'}` : undefined,
                      }}
                      onClick={(e) => handleMessageClick(e, message)}
                    >
                      {/* Reply preview */}
                      {message.replyTo && (
                        <Box
                          sx={{
                            borderLeft: '2px solid',
                            borderColor: message.senderId === currentUser?.displayName ? 'white' : 'primary.main',
                            pl: 1,
                            mb: 1,
                            opacity: 0.8,
                          }}
                        >
                          <Typography variant="caption" display="block">
                            {message.replyTo.senderId}
                          </Typography>
                          <Typography variant="caption" noWrap sx={{ display: 'block', maxWidth: 200 }}>
                            {message.replyTo.content}
                          </Typography>
                        </Box>
                      )}

                      <Typography variant="subtitle2" sx={{ fontWeight: 500, fontSize: '0.7rem', opacity: 0.85, mb: 0.25 }}>
                        {message.senderId}
                        {userSubteam && (
                          <Typography 
                            component="span" 
                            sx={{ 
                              ml: 1, 
                              fontSize: '0.7rem', 
                              fontStyle: 'italic',
                              color: userSubteam.color || '#2196f3',
                              fontWeight: 'bold'
                            }}
                          >
                            [{userSubteam.name}]
                          </Typography>
                        )}
                        {users.find(u => u.displayName === message.senderId)?.isTyping?.[currentRoom?.id || ''] && (
                          <Typography component="span" sx={{ ml: 1, fontSize: '0.7rem', fontStyle: 'italic' }}>
                            печатает...
                          </Typography>
                        )}
                      </Typography>

                      {message.isImage && message.image ? (
                        <Box sx={{ mt: 0.5, mb: 0.5 }}>
                          <img 
                            src={message.image} 
                            alt="Image" 
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '300px', 
                              borderRadius: '4px',
                              objectFit: 'contain',
                              cursor: 'pointer'
                            }} 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageClick(message.image!);
                            }}
                          />
                        </Box>
                      ) : null}

                      <Typography sx={{ wordBreak: 'break-word', fontSize: '0.9rem', lineHeight: 1.2 }}>
                        {message.content}
                        {message.edited && (
                          <Typography component="span" sx={{ fontSize: '0.7rem', opacity: 0.7, ml: 0.5, fontStyle: 'italic' }}>
                            (изменено)
                          </Typography>
                        )}
                      </Typography>

                      {/* Message status */}
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="caption" sx={{ opacity: 0.7, mr: 0.5 }}>
                          {new Date(message.timestamp?.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        {message.senderId === currentUser?.displayName && (
                          <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                            {message.status === 'sent' && <CheckIcon sx={{ fontSize: '0.8rem', opacity: 0.7 }} />}
                            {message.status === 'delivered' && <DoneAllIcon sx={{ fontSize: '0.8rem', opacity: 0.7 }} />}
                            {message.status === 'read' && <DoneAllIcon sx={{ fontSize: '0.8rem', color: '#44b700' }} />}
                          </Box>
                        )}
                      </Box>

                      {/* Reactions */}
                      {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 0.5,
                            mt: 0.5,
                            p: 0.5,
                            bgcolor: 'rgba(0,0,0,0.04)',
                            borderRadius: 1,
                          }}
                        >
                          {Object.entries(message.reactions).map(([emoji, users]) => (
                            <Chip
                              key={emoji}
                              label={`${emoji} ${users.length}`}
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReaction(message.id, emoji);
                              }}
                              sx={{
                                height: 20,
                                fontSize: '0.75rem',
                                bgcolor: users.includes(currentUser?.displayName || '') ? 'primary.light' : 'transparent',
                                color: users.includes(currentUser?.displayName || '') ? 'white' : 'inherit',
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Paper>
                  </ListItem>
                );
              })}
              <div ref={messagesEndRef} />
            </List>
          </Box>

          {/* Reply preview */}
          {replyingTo && (
            <Box
              sx={{
                p: 1,
                bgcolor: 'background.paper',
                borderTop: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ReplyIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="primary">
                  {replyingTo.senderId}
                </Typography>
                <Typography variant="body2" noWrap>
                  {replyingTo.content}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setReplyingTo(null)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

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
            {newImage && (
              <Box sx={{ mb: 1, position: 'relative', display: 'inline-block' }}>
                <img 
                  src={newImage} 
                  alt="Preview" 
                  style={{ 
                    maxWidth: '200px', 
                    maxHeight: '200px', 
                    borderRadius: '8px',
                    objectFit: 'contain'
                  }} 
                />
                <IconButton
                  size="small"
                  onClick={removeImage}
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                    '&:hover': { bgcolor: 'grey.200' }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <IconButton 
                color="primary"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                disabled={isUploading}
              >
                {isUploading ? <CircularProgress size={24} /> : <ImageIcon />}
              </IconButton>
              <IconButton
                color="primary"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <EmojiEmotionsIcon />
              </IconButton>
              <TextField
                fullWidth
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Введите сообщение..."
                variant="outlined"
                size="small"
                InputProps={{
                  endAdornment: showEmojiPicker && (
                    <Box sx={{ position: 'absolute', bottom: '100%', right: 0, zIndex: 1 }}>
                      <Paper elevation={3}>
                        <Box sx={{ p: 1 }}>
                          {['👍', '❤️', '😊', '😂', '😍', '🎉', '👏', '🤔'].map((emoji) => (
                            <IconButton
                              key={emoji}
                              size="small"
                              onClick={() => {
                                setNewMessage(prev => prev + emoji);
                                setShowEmojiPicker(false);
                              }}
                            >
                              {emoji}
                            </IconButton>
                          ))}
                        </Box>
                      </Paper>
                    </Box>
                  ),
                }}
              />
              <IconButton 
                type="submit" 
                color="primary"
                disabled={isUploading}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Message Menu */}
        <Menu
          anchorEl={messageMenuAnchor}
          open={Boolean(messageMenuAnchor)}
          onClose={handleMessageMenuClose}
        >
          <MenuItem 
            onClick={() => {
              if (selectedMessage) {
                setReplyingTo(selectedMessage);
              }
              handleMessageMenuClose();
            }}
          >
            <ListItemIcon>
              <ReplyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Ответить</ListItemText>
          </MenuItem>
          {(currentUser?.role === 'admin' || selectedMessage?.senderId === currentUser?.displayName) && (
            <MenuItem 
              onClick={() => {
                if (selectedMessage) {
                  handleEditMessage(selectedMessage);
                }
                handleMessageMenuClose();
              }}
            >
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Редактировать</ListItemText>
            </MenuItem>
          )}
          {currentUser?.role === 'admin' && (
            <MenuItem 
              onClick={() => {
                if (selectedMessage) {
                  handleDeleteMessage(selectedMessage.id);
                }
                handleMessageMenuClose();
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Удалить</ListItemText>
            </MenuItem>
          )}
          <Divider />
          <Box sx={{ p: 1 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 1, color: 'text.secondary' }}>
              Добавить реакцию:
            </Typography>
            {['👍', '❤️', '😊', '😂', '😍', '🎉', '👏', '🤔'].map((emoji) => (
              <IconButton
                key={emoji}
                size="small"
                onClick={() => {
                  if (selectedMessage) {
                    handleReaction(selectedMessage.id, emoji);
                  }
                  handleMessageMenuClose();
                }}
              >
                {emoji}
              </IconButton>
            ))}
          </Box>
        </Menu>

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

        <Dialog
          open={newChatDialogOpen}
          onClose={() => setNewChatDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Новый чат</DialogTitle>
          <DialogContent>
            <List>
              {users
                .filter(user => user.displayName !== currentUser?.displayName)
                .map(user => (
                  <ListItemButton
                    key={user.displayName}
                    onClick={() => createPrivateChat(user.displayName)}
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
                      secondary={user.isOnline ? 'В сети' : 'Не в сети'}
                      secondaryTypographyProps={{
                        sx: { color: user.isOnline ? 'success.main' : 'text.secondary' }
                      }}
                    />
                  </ListItemButton>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewChatDialogOpen(false)}>Закрыть</Button>
          </DialogActions>
        </Dialog>

        {/* Image Preview Dialog */}
        <Dialog
          open={imagePreviewOpen}
          onClose={() => setImagePreviewOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'transparent',
              boxShadow: 'none',
              overflow: 'hidden'
            }
          }}
        >
          <Box 
            sx={{ 
              position: 'relative',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%',
              minHeight: '80vh'
            }}
          >
            {previewImage && (
              <img 
                src={previewImage} 
                alt="Full size" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '90vh', 
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }} 
              />
            )}
            <IconButton
              onClick={() => setImagePreviewOpen(false)}
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                bgcolor: 'rgba(0,0,0,0.5)',
                color: 'white',
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.7)'
                }
              }}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Dialog>

        {/* Edit Message Dialog */}
        <Dialog
          open={editMessageDialogOpen}
          onClose={() => setEditMessageDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Редактировать сообщение</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Текст сообщения"
              fullWidth
              multiline
              rows={4}
              value={editedMessageContent}
              onChange={(e) => setEditedMessageContent(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditMessageDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveEditedMessage} variant="contained" color="primary">
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>

        {/* New Group Dialog */}
        <Dialog
          open={newGroupDialogOpen}
          onClose={() => setNewGroupDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Создать новую группу</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Название группы"
              fullWidth
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ mr: 2 }}>Эмодзи:</Typography>
              <TextField
                value={newGroupEmoji}
                onChange={(e) => setNewGroupEmoji(e.target.value)}
                inputProps={{ maxLength: 2 }}
                sx={{ width: '80px' }}
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={newGroupIsPublic}
                  onChange={(e) => setNewGroupIsPublic(e.target.checked)}
                />
              }
              label="Публичная группа (можно присоединиться)"
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewGroupDialogOpen(false)}>Отмена</Button>
            <Button onClick={createGroup} variant="contained" color="primary">
              Создать
            </Button>
          </DialogActions>
        </Dialog>

        {/* Join Group Dialog */}
        <Dialog
          open={joinGroupDialogOpen}
          onClose={() => setJoinGroupDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Присоединиться к группе</DialogTitle>
          <DialogContent>
            <List>
              {availableGroups.map((room) => (
                <ListItemButton
                  key={room.id}
                  onClick={() => {
                    joinGroup(room.id);
                  }}
                >
                  <Box sx={{ mr: 1, fontSize: '1.5rem' }}>
                    {room.emoji || '👥'}
                  </Box>
                  <ListItemText 
                    primary={room.name} 
                    secondary={`${room.participants.length} участников`}
                  />
                  <Button 
                    size="small" 
                    variant="outlined" 
                    color="primary"
                    startIcon={<GroupAddIcon />}
                  >
                    Присоединиться
                  </Button>
                </ListItemButton>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setJoinGroupDialogOpen(false)}>Закрыть</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Chat; 