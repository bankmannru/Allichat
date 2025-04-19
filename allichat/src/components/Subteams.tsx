import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Container,
  Typography,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Badge,
  Menu,
  DialogContentText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Notifications as NotificationsIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';

interface Subteam {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdBy: string;
  createdAt: any;
  color?: string;
}

interface Notification {
  id: string;
  type: 'subteam_invite';
  subteamId: string;
  subteamName: string;
  fromUser: string;
  toUser: string;
  createdAt: any;
  read: boolean;
}

const COLORS = [
  { name: 'Красный', value: '#f44336' },
  { name: 'Розовый', value: '#e91e63' },
  { name: 'Фиолетовый', value: '#9c27b0' },
  { name: 'Индиго', value: '#3f51b5' },
  { name: 'Синий', value: '#2196f3' },
  { name: 'Голубой', value: '#03a9f4' },
  { name: 'Бирюзовый', value: '#00bcd4' },
  { name: 'Зеленый', value: '#4caf50' },
  { name: 'Светло-зеленый', value: '#8bc34a' },
  { name: 'Лайм', value: '#cddc39' },
  { name: 'Желтый', value: '#ffeb3b' },
  { name: 'Амбер', value: '#ffc107' },
  { name: 'Оранжевый', value: '#ff9800' },
  { name: 'Коричневый', value: '#795548' },
  { name: 'Серый', value: '#9e9e9e' },
];

const Subteams: React.FC = () => {
  const { currentUser } = useAuth();
  const [subteams, setSubteams] = useState<Subteam[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newSubteamName, setNewSubteamName] = useState('');
  const [newSubteamDescription, setNewSubteamDescription] = useState('');
  const [newSubteamColor, setNewSubteamColor] = useState('#2196f3');
  const [editingSubteam, setEditingSubteam] = useState<Subteam | null>(null);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedSubteam, setSelectedSubteam] = useState<Subteam | null>(null);
  const [selectedNewMember, setSelectedNewMember] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationMenuAnchor, setNotificationMenuAnchor] = useState<null | HTMLElement>(null);
  const [newMember, setNewMember] = useState('');

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

  useEffect(() => {
    if (!currentUser) return;

    const usersQuery = query(collection(db, 'users'));
    
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData: any[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ id: doc.id, ...doc.data() });
      });
      setUsers(usersData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('toUser', '==', currentUser.displayName),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData: Notification[] = [];
      snapshot.forEach((doc) => {
        notificationsData.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(notificationsData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateSubteam = async () => {
    if (!currentUser || !newSubteamName.trim()) return;

    try {
      await addDoc(collection(db, 'subteams'), {
        name: newSubteamName,
        description: newSubteamDescription,
        members: [currentUser.displayName],
        createdBy: currentUser.displayName,
        createdAt: serverTimestamp(),
        color: newSubteamColor,
      });

      setOpenDialog(false);
      setNewSubteamName('');
      setNewSubteamDescription('');
      setNewSubteamColor('#2196f3');
    } catch (error) {
      console.error('Error creating subteam:', error);
    }
  };

  const handleDeleteSubteam = async (subteamId: string) => {
    try {
      await deleteDoc(doc(db, 'subteams', subteamId));
    } catch (error) {
      console.error('Error deleting subteam:', error);
    }
  };

  const handleEditSubteam = async (subteam: Subteam) => {
    setEditingSubteam(subteam);
    setNewSubteamName(subteam.name);
    setNewSubteamDescription(subteam.description);
    setNewSubteamColor(subteam.color || '#2196f3');
    setOpenDialog(true);
  };

  const handleUpdateSubteam = async () => {
    if (!editingSubteam || !newSubteamName.trim()) return;

    try {
      await updateDoc(doc(db, 'subteams', editingSubteam.id), {
        name: newSubteamName,
        description: newSubteamDescription,
        color: newSubteamColor,
      });

      setOpenDialog(false);
      setEditingSubteam(null);
      setNewSubteamName('');
      setNewSubteamDescription('');
      setNewSubteamColor('#2196f3');
    } catch (error) {
      console.error('Error updating subteam:', error);
    }
  };

  const handleColorChange = (event: SelectChangeEvent) => {
    setNewSubteamColor(event.target.value);
  };

  const handleAddMember = async () => {
    if (!selectedSubteam || !newMember) return;

    try {
      const subteamRef = doc(db, 'subteams', selectedSubteam.id);
      const updatedMembers = [...selectedSubteam.members, newMember];
      
      await updateDoc(subteamRef, {
        members: updatedMembers
      });

      // Update local state
      setSubteams(prevSubteams => 
        prevSubteams.map(subteam => 
          subteam.id === selectedSubteam.id 
            ? { ...subteam, members: updatedMembers }
            : subteam
        )
      );

      setAddMemberDialogOpen(false);
      setNewMember('');
      setSelectedSubteam(null);
    } catch (error) {
      console.error('Error adding member to subteam:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      await updateDoc(doc(db, 'notifications', notification.id), {
        read: true
      });

      setNotificationMenuAnchor(null);

      console.log(`Navigating to subteam: ${notification.subteamId}`);
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationMenuAnchor(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationMenuAnchor(null);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Подгруппы
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton 
            color="primary" 
            onClick={handleNotificationMenuOpen}
            aria-label="notifications"
          >
            <Badge badgeContent={notifications.length} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingSubteam(null);
              setNewSubteamName('');
              setNewSubteamDescription('');
              setNewSubteamColor('#2196f3');
              setOpenDialog(true);
            }}
          >
            Создать подгруппу
          </Button>
        </Box>
      </Box>

      <Paper elevation={2}>
        <List>
          {subteams.map((subteam, index) => (
            <React.Fragment key={subteam.id}>
              <ListItem>
                <Box 
                  sx={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: '50%', 
                    backgroundColor: subteam.color || '#2196f3',
                    mr: 2,
                    border: '1px solid rgba(0,0,0,0.1)'
                  }} 
                />
                <ListItemText
                  primary={subteam.name}
                  secondary={
                    <>
                      <Typography component="span" variant="body2" color="text.primary">
                        {subteam.description}
                      </Typography>
                      <br />
                      <Typography component="span" variant="body2" color="text.secondary">
                        Участники: {subteam.members.join(', ')}
                      </Typography>
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  {currentUser?.displayName === subteam.createdBy && (
                    <>
                      <IconButton
                        edge="end"
                        aria-label="add member"
                        onClick={() => {
                          setSelectedSubteam(subteam);
                          setAddMemberDialogOpen(true);
                        }}
                        sx={{ mr: 1 }}
                      >
                        <PersonAddIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="edit"
                        onClick={() => handleEditSubteam(subteam)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteSubteam(subteam.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
              {index < subteams.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {editingSubteam ? 'Редактировать подгруппу' : 'Создать подгруппу'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название"
            fullWidth
            value={newSubteamName}
            onChange={(e) => setNewSubteamName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Описание"
            fullWidth
            multiline
            rows={4}
            value={newSubteamDescription}
            onChange={(e) => setNewSubteamDescription(e.target.value)}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel id="color-select-label">Цвет</InputLabel>
            <Select
              labelId="color-select-label"
              value={newSubteamColor}
              label="Цвет"
              onChange={handleColorChange}
            >
              {COLORS.map((color) => (
                <MenuItem key={color.value} value={color.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box 
                      sx={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: '50%', 
                        backgroundColor: color.value,
                        mr: 1,
                        border: '1px solid rgba(0,0,0,0.1)'
                      }} 
                    />
                    {color.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Отмена</Button>
          <Button
            onClick={editingSubteam ? handleUpdateSubteam : handleCreateSubteam}
            variant="contained"
          >
            {editingSubteam ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={addMemberDialogOpen}
        onClose={() => {
          setAddMemberDialogOpen(false);
          setNewMember('');
          setSelectedSubteam(null);
        }}
      >
        <DialogTitle>Добавить участника</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Выберите подкоманду и участника для добавления
          </DialogContentText>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Подкоманда</InputLabel>
            <Select
              value={selectedSubteam?.id || ''}
              onChange={(e) => {
                const subteam = subteams.find(s => s.id === e.target.value);
                setSelectedSubteam(subteam || null);
              }}
            >
              {subteams.map((subteam) => (
                <MenuItem key={subteam.id} value={subteam.id}>
                  {subteam.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Участник</InputLabel>
            <Select
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddMemberDialogOpen(false);
              setNewMember('');
              setSelectedSubteam(null);
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleAddMember}
            disabled={!selectedSubteam || !newMember}
          >
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={notificationMenuAnchor}
        open={Boolean(notificationMenuAnchor)}
        onClose={handleNotificationMenuClose}
      >
        {notifications.length === 0 ? (
          <MenuItem disabled>Нет новых уведомлений</MenuItem>
        ) : (
          notifications.map((notification) => (
            <MenuItem 
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
            >
              <ListItemText
                primary={`Приглашение в подгруппу "${notification.subteamName}"`}
                secondary={`От: ${notification.fromUser}`}
              />
            </MenuItem>
          ))
        )}
      </Menu>
    </Container>
  );
};

export default Subteams; 