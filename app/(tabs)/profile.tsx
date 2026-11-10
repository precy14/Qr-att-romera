
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth, signOut } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

const C = {
  bg: '#EDF6FD',
  white: '#FFFFFF',
  primary: '#3188C8',
  dark: '#205D87',
  pale: '#E1F1FF',
  light: '#F6FAFE',
  border: '#D8E7F3',
  text: '#203C50',
  muted: '#7A92A5',
  green: '#319875',
  greenBg: '#E8F6EF',
  red: '#D84F60',
  redBg: '#FFF0F1',
};

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setPhoto(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [data, savedPhoto] = await Promise.all([
        getProfile(user.id),
        AsyncStorage.getItem(`profile_photo_${user.id}`),
      ]);

      setProfile(data);
      setName(data?.full_name ?? '');
      setPhoto(savedPhoto);
    } catch (error) {
      console.error('Profile load error:', error);
      Alert.alert(
        'Unable to load profile',
        'Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  const choosePhoto = async () => {
    if (!user) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission required',
          'Please allow gallery access to select your profile picture.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const uri = result.assets[0].uri;

      await AsyncStorage.setItem(`profile_photo_${user.id}`, uri);
      setPhoto(uri);

      Alert.alert('Success', 'Your profile picture has been updated.');
    } catch (error) {
      console.error('Photo picker error:', error);
      Alert.alert('Photo error', 'Unable to update your picture.');
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    const cleanName = name.trim();

    if (!cleanName) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(
        user.id,
        { full_name: cleanName },
        user.email ?? undefined
      );

      if (error) {
        Alert.alert('Save failed', error);
        return;
      }

      setProfile((current) =>
        current ? { ...current, full_name: cleanName } : current
      );
      setName(cleanName);
      setEditing(false);

      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error) {
      console.error('Profile save error:', error);
      Alert.alert('Error', 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    setName(profile?.full_name ?? '');
    setEditing(false);
  };

  const confirmSignOut = () => {
    if (signingOut) return;

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);

            try {
              await signOut();
              router.replace('/login');
            } catch (error: any) {
              Alert.alert(
                'Sign out failed',
                error?.message || 'Please try again.'
              );
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const initials = (profile?.full_name || user?.email || 'User')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.loadingCircle}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
        <Text style={styles.loadingTitle}>Loading your profile</Text>
        <Text style={styles.muted}>Please wait a moment...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.loadingCircle}>
          <Ionicons name="person-outline" size={36} color={C.primary} />
        </View>
        <Text style={styles.pageTitle}>Welcome back!</Text>
        <Text style={styles.muted}>Sign in to view your profile.</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.primaryButtonText}>Go to Login</Text>
          <Ionicons name="arrow-forward" size={18} color={C.white} />
        </Pressable>
      </View>
    );
  }

  const isTeacher = profile?.role?.toLowerCase() === 'teacher';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>QR ATTENDANCE</Text>
            <Text style={styles.pageTitle}>My Profile</Text>
            <Text style={styles.subtitle}>
              Manage your personal account.
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={() => void loadProfile()}
            accessibilityRole="button"
            accessibilityLabel="Refresh profile"
          >
            <Ionicons name="refresh-outline" size={22} color={C.dark} />
          </Pressable>
        </View>

        {/* PROFILE CARD */}
        <View style={styles.hero}>
          <View style={styles.heroDecoration} />

          <View style={styles.heroTop}>
            <View style={styles.accountLabel}>
              <Ionicons name="shield-checkmark" size={14} color={C.dark} />
              <Text style={styles.accountLabelText}>MY ACCOUNT</Text>
            </View>
            <Ionicons name="sparkles-outline" size={24} color={C.primary} />
          </View>

          <Pressable
            onPress={choosePhoto}
            style={({ pressed }) => [
              styles.avatarWrapper,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
          >
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.initials}>{initials || 'U'}</Text>
              </View>
            )}

            <View style={styles.cameraButton}>
              <Ionicons name="camera" size={17} color={C.white} />
            </View>
          </Pressable>

          <Text style={styles.profileName}>
            {profile?.full_name?.trim() || 'Complete Your Profile'}
          </Text>

          <Text style={styles.email} selectable>
            {user.email || 'No email available'}
          </Text>

          <View
            style={[
              styles.roleBadge,
              isTeacher ? styles.teacherBadge : styles.studentBadge,
            ]}
          >
            <Ionicons
              name={isTeacher ? 'school-outline' : 'person-outline'}
              size={15}
              color={isTeacher ? C.white : C.dark}
            />
            <Text
              style={[
                styles.roleText,
                !isTeacher && styles.studentRoleText,
              ]}
            >
              {isTeacher ? 'Teacher Account' : 'Student Account'}
            </Text>
          </View>

          <Pressable
            onPress={choosePhoto}
            style={({ pressed }) => [
              styles.changePhotoButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="image-outline" size={17} color={C.dark} />
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </Pressable>

          <View style={styles.heroFooter}>
            <View style={styles.onlineDot} />
            <Text style={styles.heroFooterText}>
              Your attendance account
            </Text>
            <Ionicons
              name="checkmark-circle"
              size={17}
              color={C.green}
            />
          </View>
        </View>

        {/* PERSONAL INFORMATION */}
        <View style={styles.sectionHeading}>
          <View style={styles.sectionIcon}>
            <Ionicons name="person-outline" size={21} color={C.primary} />
          </View>

          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Text style={styles.sectionSubtitle}>
              Your basic account details
            </Text>
          </View>

          {!editing && (
            <Pressable
              onPress={() => setEditing(true)}
              style={styles.editButton}
            >
              <Ionicons name="create-outline" size={17} color={C.primary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>FULL NAME</Text>

          {editing ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={C.muted}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!saving}
              returnKeyType="done"
              onSubmitEditing={() => void saveProfile()}
            />
          ) : (
            <InfoRow
              icon="person-outline"
              value={profile?.full_name || 'Not set'}
            />
          )}

          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <InfoRow
            icon="mail-outline"
            value={user.email || 'Not available'}
          />

          <Text style={styles.label}>ACCOUNT ID</Text>
          <InfoRow icon="finger-print-outline" value={user.id} small />

          {editing && (
            <View style={styles.actions}>
              <Pressable
                style={styles.cancelButton}
                onPress={cancelEditing}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.saveButton, saving && styles.disabled]}
                onPress={() => void saveProfile()}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
                    color={C.white}
                  />
                )}
                <Text style={styles.saveText}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ACADEMIC INFORMATION */}
        <View style={styles.sectionHeading}>
          <View style={styles.sectionIcon}>
            <Ionicons name="school-outline" size={22} color={C.primary} />
          </View>

          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionTitle}>Academic Information</Text>
            <Text style={styles.sectionSubtitle}>
              Your school and program details
            </Text>
          </View>
        </View>

        <View style={styles.academicCard}>
          <View style={styles.academicBanner}>
            <View style={styles.academicBannerIcon}>
              <Ionicons name="school" size={28} color={C.white} />
            </View>

            <View style={styles.academicBannerContent}>
              <Text style={styles.academicBannerLabel}>
                CURRENT PROGRAM
              </Text>
              <Text style={styles.academicBannerTitle}>
                Bachelor of Science in Information Technology
              </Text>
              <Text style={styles.academicBannerSubtitle}>
                BSIT • 3rd Year • Block D
              </Text>
            </View>
          </View>

          <View style={styles.academicDetails}>
            <AcademicDetail
              icon="business-outline"
              label="Department"
              value="BSIT"
            />

            <View style={styles.academicDetailDivider} />

            <AcademicDetail
              icon="book-outline"
              label="Year Level"
              value="3rd Year"
            />

            <View style={styles.academicDetailDivider} />

            <AcademicDetail
              icon="people-outline"
              label="Block / Section"
              value="Block D"
            />
          </View>

          <View style={styles.academicFooter}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={C.green}
            />
            <Text style={styles.academicFooterText}>
              Academic profile overview
            </Text>
          </View>
        </View>

        {/* TIP */}
        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb-outline" size={22} color={C.primary} />
          </View>

          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Keep your profile updated</Text>
            <Text style={styles.tipDescription}>
              Use your correct name and a recognizable photo to help
              identify your attendance account.
            </Text>
          </View>
        </View>

        {/* SIGN OUT */}
        <View style={styles.signOutCard}>
          <View style={styles.signOutTop}>
            <View style={styles.signOutIcon}>
              <Ionicons name="log-out-outline" size={22} color={C.red} />
            </View>

            <View style={styles.signOutInfo}>
              <Text style={styles.signOutTitle}>Sign Out</Text>
              <Text style={styles.signOutDescription}>
                Sign out of your account on this device.
              </Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.pressed,
              signingOut && styles.disabled,
            ]}
            onPress={confirmSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <Ionicons name="log-out-outline" size={19} color={C.white} />
            )}
            <Text style={styles.signOutButtonText}>
              {signingOut ? 'Signing Out...' : 'Sign Out'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Ionicons name="heart" size={13} color={C.primary} />
          <Text style={styles.footerText}>
            QR-ATT • School Attendance
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  value,
  small = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  small?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={19} color={C.primary} />
      </View>
      <Text
        style={[styles.infoValue, small && styles.smallValue]}
        selectable
      >
        {value}
      </Text>
    </View>
  );
}

function AcademicDetail({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.academicDetailItem}>
      <View style={styles.academicDetailIcon}>
        <Ionicons name={icon} size={22} color={C.primary} />
      </View>
      <Text style={styles.academicDetailLabel}>{label}</Text>
      <Text style={styles.academicDetailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
    padding: 24,
  },
  loadingCircle: {
    width: 78,
    height: 78,
    borderRadius: 25,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },
  loadingTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: '800',
  },
  muted: {
    color: C.muted,
    fontSize: 13,
    marginTop: 7,
    textAlign: 'center',
  },
  header: {
    width: '100%',
    maxWidth: 600,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 23,
  },
  eyebrow: {
    fontSize: 10,
    color: C.primary,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 7,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -0.8,
  },
  subtitle: {
    color: C.muted,
    fontSize: 13,
    marginTop: 5,
  },
  refreshButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: C.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.07,
    shadowRadius: 15,
    elevation: 3,
  },
  heroDecoration: {
    position: 'absolute',
    top: -75,
    right: -55,
    width: 190,
    height: 190,
    borderRadius: 100,
    backgroundColor: C.pale,
  },
  heroTop: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  accountLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.pale,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  accountLabelText: {
    fontSize: 10,
    color: C.dark,
    fontWeight: '900',
    letterSpacing: 1,
  },
  avatarWrapper: {
    width: 122,
    height: 122,
    borderRadius: 61,
    padding: 4,
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: C.pale,
    marginBottom: 16,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 56,
    backgroundColor: C.pale,
  },
  avatarPlaceholder: {
    flex: 1,
    borderRadius: 56,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: C.dark,
    fontSize: 36,
    fontWeight: '900',
  },
  cameraButton: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: C.primary,
    borderWidth: 3,
    borderColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 23,
    fontWeight: '900',
    color: C.text,
    textAlign: 'center',
  },
  email: {
    fontSize: 12,
    color: C.muted,
    marginTop: 7,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    marginTop: 14,
  },
  teacherBadge: {
    backgroundColor: C.primary,
  },
  studentBadge: {
    backgroundColor: C.pale,
    borderWidth: 1,
    borderColor: C.border,
  },
  roleText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '800',
  },
  studentRoleText: {
    color: C.dark,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.light,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 17,
  },
  changePhotoText: {
    color: C.dark,
    fontSize: 12,
    fontWeight: '800',
  },
  heroFooter: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 21,
    paddingTop: 16,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  heroFooterText: {
    flex: 1,
    color: C.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeading: {
    width: '100%',
    maxWidth: 600,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 13,
  },
  sectionIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: C.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: C.muted,
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: C.pale,
    borderRadius: 12,
  },
  editButtonText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  card: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: C.white,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: C.border,
    padding: 17,
    marginBottom: 26,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 9,
    elevation: 2,
  },
  label: {
    color: C.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginTop: 4,
    marginBottom: 9,
  },
  input: {
    minHeight: 52,
    backgroundColor: C.light,
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: C.text,
    fontSize: 14,
    marginBottom: 17,
  },
  infoRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: C.light,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 16,
  },
  infoIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoValue: {
    flex: 1,
    color: C.text,
    fontSize: 13,
    fontWeight: '600',
  },
  smallValue: {
    fontSize: 10,
    lineHeight: 15,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
    marginTop: 2,
  },
  cancelButton: {
    minHeight: 45,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 13,
    backgroundColor: C.pale,
  },
  cancelText: {
    color: C.dark,
    fontSize: 12,
    fontWeight: '800',
  },
  saveButton: {
    minHeight: 45,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    borderRadius: 13,
    backgroundColor: C.primary,
  },
  saveText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.65,
  },

  /* ACADEMIC CARD */
  academicCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: C.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
    marginBottom: 26,
    overflow: 'hidden',
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  academicBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: C.primary,
    borderRadius: 19,
    padding: 16,
  },
  academicBannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#579DD0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  academicBannerContent: {
    flex: 1,
  },
  academicBannerLabel: {
    color: '#DDF2FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  academicBannerTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
  },
  academicBannerSubtitle: {
    color: '#E0F2FF',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  academicDetails: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  academicDetailItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  academicDetailIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: C.pale,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  academicDetailLabel: {
    color: C.muted,
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 6,
  },
  academicDetailValue: {
    color: C.dark,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  academicDetailDivider: {
    width: 1,
    height: 80,
    backgroundColor: C.border,
    marginTop: 5,
  },
  academicFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: C.greenBg,
    borderRadius: 13,
    paddingVertical: 11,
  },
  academicFooterText: {
    color: C.green,
    fontSize: 11,
    fontWeight: '700',
  },

  tipCard: {
    width: '100%',
    maxWidth: 600,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: C.pale,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 23,
  },
  tipIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 5,
  },
  tipDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  signOutCard: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: C.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 17,
    gap: 17,
  },
  signOutTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signOutIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: C.redBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutInfo: {
    flex: 1,
  },
  signOutTitle: {
    color: C.text,
    fontSize: 15,
    fontWeight: '900',
  },
  signOutDescription: {
    color: C.muted,
    fontSize: 11,
    marginTop: 4,
  },
  signOutButton: {
    minHeight: 49,
    borderRadius: 15,
    backgroundColor: C.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  signOutButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '900',
  },
  primaryButton: {
    minHeight: 49,
    width: '100%',
    maxWidth: 300,
    marginTop: 22,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 26,
  },
  footerText: {
    color: C.muted,
    fontSize: 11,
  },
});
