import React, { useState, useEffect } from 'react';
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
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import {
  Container,
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Divider,
  ListItemSecondaryAction,
  ListItemButton,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  ExitToApp as ExitToAppIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';

interface Subteam {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: any;
  members: string[];
  parentTeam: string;
}

const Subteams: React.FC = () => {
  const { currentUser } = useAuth();
  const [subteams, setSubteams] = useState<Subteam[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newSubteamDialogOpen, setNewSubteamDialogOpen] = useState(false);
  const [newSubteamName, setNewSubteamName] = useState('');
  const [newSubteamDescription, setNewSubteamDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSubteam, setSelectedSubteam] = useState<Subteam | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedNewMember, setSelectedNewMember] = useState<string>('');

  // Fetch subteams
  useEffect(() => {
    if (!currentUser) return;

    const subteamsQuery = query(
      collection(db, 'subteams'),
      where('parentTeam', '==', 'USBшники')
    );

    const unsubscribe = onSnapshot(subteamsQuery, (snapshot) => {
      const subteamsData: Subteam[] = [];
      snapshot.forEach((doc) => {
        subteamsData.push({ id: doc.id, ...doc.data() } as Subteam);
      });
      setSubteams(subteamsData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch users
  useEffect(() => {
    const usersQuery = query(collection(db, 'users'));
    
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const usersData: any[] = [];
      snapshot.forEach((doc) => {
        usersData.push({ ...doc.data() });
      });
      setUsers(usersData);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateSubteam = async () => {
    if (!currentUser || !newSubteamName.trim()) return;

    try {
      const subteam = {
        name: newSubteamName,
        description: newSubteamDescription,
        createdBy: currentUser.displayName,
        createdAt: serverTimestamp(),
        members: [currentUser.displayName, ...selectedMembers],
        parentTeam: 'USBшники'
      };

      await addDoc(collection(db, 'subteams'), subteam);
      setNewSubteamDialogOpen(false);
      setNewSubteamName('');
      setNewSubteamDescription('');
      setSelectedMembers([]);
    } catch (error) {
      console.error('Error creating subteam:', error);
    }
  };

  const handleDeleteSubteam = async (subteamId: string) => {
    try {
      await deleteDoc(doc(db, 'subteams', subteamId));
      setMenuAnchorEl(null);
      setSelectedSubteam(null);
    } catch (error) {
      console.error('Error deleting subteam:', error);
    }
  };

  const handleEditSubteam = async () => {
    if (!selectedSubteam || !editName.trim()) return;

    try {
      await updateDoc(doc(db, 'subteams', selectedSubteam.id), {
        name: editName,
        description: editDescription
      });
      setEditDialogOpen(false);
      setSelectedSubteam(null);
    } catch (error) {
      console.error('Error updating subteam:', error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedSubteam || !selectedNewMember) return;

    try {
      const updatedMembers = [...selectedSubteam.members, selectedNewMember];
      await updateDoc(doc(db, 'subteams', selectedSubteam.id), {
        members: updatedMembers
      });
      setAddMemberDialogOpen(false);
      setSelectedNewMember('');
    } catch (error) {
      console.error('Error adding member:', error);
    }
  };

  const handleRemoveMember = async (subteamId: string, memberName: string) => {
    try {
      const subteam = subteams.find(s => s.id === subteamId);
      if (!subteam) return;

      const updatedMembers = subteam.members.filter(m => m !== memberName);
      await updateDoc(doc(db, 'subteams', subteamId), {
        members: updatedMembers
      });
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Подгруппы команды USBшники
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setNewSubteamDialogOpen(true)}
        >
          Создать подгруппу
        </Button>
      </Box>

      <Grid container spacing={3}>
        {subteams.map((subteam) => (
          <Grid item xs={12} md={6} lg={4} key={subteam.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" gutterBottom>
                    {subteam.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      setMenuAnchorEl(e.currentTarget);
                      setSelectedSubteam(subteam);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                {subteam.description && (
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    {subteam.description}
                  </Typography>
                )}
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Участники:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {subteam.members.map((member) => (
                    <Chip
                      key={member}
                      label={member}
                      size="small"
                      onDelete={
                        (currentUser?.displayName === subteam.createdBy || 
                         currentUser?.displayName === member) ?
                        () => handleRemoveMember(subteam.id, member) :
                        undefined
                      }
                    />
                  ))}
                </Box>
              </CardContent>
              {currentUser?.displayName === subteam.createdBy && (
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<PersonAddIcon />}
                    onClick={() => {
                      setSelectedSubteam(subteam);
                      setAddMemberDialogOpen(true);
                    }}
                  >
                    Добавить участника
                  </Button>
                </CardActions>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create Subteam Dialog */}
      <Dialog
        open={newSubteamDialogOpen}
        onClose={() => setNewSubteamDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Создать новую подгруппу</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название подгруппы"
            fullWidth
            value={newSubteamName}
            onChange={(e) => setNewSubteamName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Описание (необязательно)"
            fullWidth
            multiline
            rows={3}
            value={newSubteamDescription}
            onChange={(e) => setNewSubteamDescription(e.target.value)}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Добавить участников</InputLabel>
            <Select
              multiple
              value={selectedMembers}
              onChange={(e) => setSelectedMembers(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              {users
                .filter(user => user.displayName !== currentUser?.displayName)
                .map((user) => (
                  <MenuItem key={user.displayName} value={user.displayName}>
                    {user.displayName}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewSubteamDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleCreateSubteam} variant="contained" color="primary">
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Subteam Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Редактировать подгруппу</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Название подгруппы"
            fullWidth
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Описание"
            fullWidth
            multiline
            rows={3}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleEditSubteam} variant="contained" color="primary">
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog
        open={addMemberDialogOpen}
        onClose={() => setAddMemberDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Добавить участника</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Выберите участника</InputLabel>
            <Select
              value={selectedNewMember}
              onChange={(e) => setSelectedNewMember(e.target.value)}
            >
              {users
                .filter(user => 
                  user.displayName !== currentUser?.displayName && 
                  !selectedSubteam?.members.includes(user.displayName)
                )
                .map((user) => (
                  <MenuItem key={user.displayName} value={user.displayName}>
                    {user.displayName}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMemberDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleAddMember} variant="contained" color="primary">
            Добавить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Subteam Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => {
          setMenuAnchorEl(null);
          setSelectedSubteam(null);
        }}
      >
        <MenuItem
          onClick={() => {
            setEditName(selectedSubteam?.name || '');
            setEditDescription(selectedSubteam?.description || '');
            setEditDialogOpen(true);
            setMenuAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Редактировать</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedSubteam) {
              handleDeleteSubteam(selectedSubteam.id);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Удалить</ListItemText>
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default Subteams; 