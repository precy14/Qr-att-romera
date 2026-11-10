import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { signOut, useAuth } from '@/lib/auth';

type Profile = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type EventRecord = {
  id: string | number;
  title?: string | null;
  name?: string | null;
  created_at?: string | null;
};

type AttendanceRecord = {
  id: string | number;
  student_name?: string | null;
  full_name?: string | null;
  event_name?: string | null;
  status?: string | null;
  created_at?: string | null;
};

const COLORS = {
  primary: '#38A7E8',
  primaryDark: '#147CB5',
  background: '#F2F9FF',
  card: '#FFFFFF',
  text: '#17324D',
  muted: '#71869A',
  border: '#DCEAF5',
  success: '#16875B',
  danger: '#C0392B',
  lightBlue: '#E1F3FF',
};

type Tab = 'overview' | 'users' | 'events' | 'attendance';

export default function AdminScreen() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();

  const [tab, setTab] = useState<Tab>('overview');
  const [adminLoading, setAdminLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const [users, setUsers] = useState<Profile[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  const [userCount, setUserCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);

  
const loadDashboard = useCallback(async () => {
  if (!session?.user?.id) {
    setUsers([]);
    setEvents([]);
    setAttendance([]);
    setUserCount(0);
    setEventCount(0);
    setAttendanceCount(0);
    setAdminLoading(false);
    setRefreshing(false);
    return;
  }

  setError('');

  try {
    // STEP 1: Verify admin account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(
        `Unable to verify admin role: ${profileError.message}`
      );
    }

    const role = String(profile?.role ?? '')
      .trim()
      .toLowerCase();

    if (!['admin', 'administrator'].includes(role)) {
      setUsers([]);
      setEvents([]);
      setAttendance([]);
      setUserCount(0);
      setEventCount(0);
      setAttendanceCount(0);

      setError(
        `Admin access only. Your current role is "${role || 'not assigned'}".`
      );
      return;
    }

    // STEP 2: Fetch each table independently
    const [
      usersResult,
      eventsResult,
      attendanceResult,
      userCountResult,
      eventCountResult,
      attendanceCountResult,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .limit(100),

      supabase
        .from('events')
        .select('*')
        .limit(100),

      supabase
        .from('attendance')
        .select('*')
        .limit(100),

      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true }),

      supabase
        .from('events')
        .select('*', { count: 'exact', head: true }),

      supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true }),
    ]);

    // STEP 3: Display successful results even if another query fails
    const errors: string[] = [];

    if (usersResult.error) {
      errors.push(`Users: ${usersResult.error.message}`);
    } else {
      const userData = (usersResult.data ?? []) as Profile[];

      setUsers(userData);
      setUserCount(userCountResult.count ?? userData.length);
    }

    if (eventsResult.error) {
      errors.push(`Events: ${eventsResult.error.message}`);
    } else {
      const eventData = (eventsResult.data ?? []) as EventRecord[];

      setEvents(eventData);
      setEventCount(eventCountResult.count ?? eventData.length);
    }

    if (attendanceResult.error) {
      errors.push(`Attendance: ${attendanceResult.error.message}`);
    } else {
      const attendanceData = (
        attendanceResult.data ?? []
      ) as AttendanceRecord[];

      // Sort by date if the column exists
      attendanceData.sort((a, b) => {
        const dateA = a.created_at
          ? new Date(a.created_at).getTime()
          : 0;

        const dateB = b.created_at
          ? new Date(b.created_at).getTime()
          : 0;

        return dateB - dateA;
      });

      setAttendance(attendanceData);
      setAttendanceCount(
        attendanceCountResult.count ?? attendanceData.length
      );
    }

    if (userCountResult.error) {
      errors.push(`User count: ${userCountResult.error.message}`);
    }

    if (eventCountResult.error) {
      errors.push(`Event count: ${eventCountResult.error.message}`);
    }

    if (attendanceCountResult.error) {
      errors.push(
        `Attendance count: ${attendanceCountResult.error.message}`
      );
    }

    if (errors.length > 0) {
      setError(errors.join('\n\n'));
    }

  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unable to load admin dashboard.';

    setError(message);
  } finally {
    setAdminLoading(false);
    setRefreshing(false);
  }
}, [session?.user?.id]);


  useEffect(() => {
    if (!authLoading) {
      if (!session) {
        router.replace('/login');
        setAdminLoading(false);
      } else {
        void loadDashboard();
      }
    }
  }, [authLoading, session, router, loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadDashboard();
  }, [loadDashboard]);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            router.replace('/login');
          } catch (err: unknown) {
            const message =
              err instanceof Error ? err.message : 'Could not log out.';
            Alert.alert('Logout failed', message);
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const filteredUsers = users.filter((item) =>
    `${item.full_name ?? item.name ?? ''} ${item.email ?? ''} ${item.role ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredEvents = events.filter((item) =>
    `${item.title ?? item.name ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredAttendance = attendance.filter((item) =>
    `${item.student_name ?? item.full_name ?? ''} ${item.event_name ?? ''} ${item.status ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (authLoading || adminLoading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark" size={28} color={COLORS.primaryDark} />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>QR ATTENDANCE SYSTEM</Text>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Manage your school activities</Text>
          </View>

          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={signingOut}
            accessibilityLabel="Log out"
          >
            {signingOut ? (
              <ActivityIndicator color={COLORS.danger} />
            ) : (
              <Ionicons name="log-out-outline" size={23} color={COLORS.danger} />
            )}
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={24} color={COLORS.danger} />
            <View style={styles.errorContent}>
              <Text style={styles.errorTitle}>Dashboard notice</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={onRefresh}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeText}>
            <Text style={styles.welcomeLabel}>WELCOME BACK</Text>
            <Text style={styles.welcomeTitle}>School Administrator</Text>
            <Text style={styles.welcomeSubtitle}>
              Here's an overview of your attendance system.
            </Text>
          </View>
          <Ionicons name="school-outline" size={48} color="#FFFFFF" />
        </View>


        <Text style={styles.sectionTitle}>Manage Records</Text>

        <View style={styles.tabs}>
          {([
            { key: 'overview', label: 'Overview', icon: 'grid-outline' },
            { key: 'users', label: 'Users', icon: 'people-outline' },
            { key: 'events', label: 'Events', icon: 'calendar-outline' },
            { key: 'attendance', label: 'Attendance', icon: 'list-outline' },
          ] as const).map((item) => (
            <Pressable
              key={item.key}
              onPress={() => {
                setTab(item.key);
                setSearch('');
              }}
              style={[styles.tab, tab === item.key && styles.activeTab]}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={tab === item.key ? '#FFFFFF' : COLORS.muted}
              />
              <Text style={[styles.tabText, tab === item.key && styles.activeTabText]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab !== 'overview' ? (
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={COLORS.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={`Search ${tab}...`}
              placeholderTextColor={COLORS.muted}
              style={styles.searchInput}
              autoCapitalize="none"
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.muted} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {tab === 'overview' ? (
          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <Text style={styles.panelTitle}>Quick Summary</Text>
              <Ionicons name="analytics-outline" size={22} color={COLORS.primary} />
            </View>
            <SummaryRow label="Registered users" value={userCount} />
            <SummaryRow label="School events" value={eventCount} />
            <SummaryRow label="Attendance records" value={attendanceCount} />
            <Text style={styles.helperText}>
              Pull down to refresh the dashboard. Tap a category above to view its records.
            </Text>
          </View>
        ) : null}

        {tab === 'users' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Registered Users ({filteredUsers.length})</Text>
            {filteredUsers.length === 0 ? (
              <EmptyState message="No matching users found." />
            ) : (
              filteredUsers.map((item) => (
                <View key={item.id} style={styles.recordRow}>
                  <View style={styles.avatar}>
                    <Ionicons name="person-outline" size={21} color={COLORS.primaryDark} />
                  </View>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordTitle}>
                      {item.full_name || item.name || 'Unnamed User'}
                    </Text>
                    <Text style={styles.recordSubtitle}>{item.email || item.id}</Text>
                    <Text style={styles.recordMeta}>
                      Role: {item.role || 'Not specified'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {tab === 'events' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>School Events ({filteredEvents.length})</Text>
            {filteredEvents.length === 0 ? (
              <EmptyState message="No matching events found." />
            ) : (
              filteredEvents.map((item) => (
                <View key={String(item.id)} style={styles.recordRow}>
                  <View style={[styles.avatar, { backgroundColor: '#E6F7EF' }]}>
                    <Ionicons name="calendar-outline" size={21} color={COLORS.success} />
                  </View>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordTitle}>
                      {item.title || item.name || 'Untitled Event'}
                    </Text>
                    <Text style={styles.recordSubtitle}>Event ID: {item.id}</Text>
                    {item.created_at ? (
                      <Text style={styles.recordMeta}>
                        Created: {new Date(item.created_at).toLocaleDateString()}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {tab === 'attendance' ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>
              Attendance Records ({filteredAttendance.length})
            </Text>
            {filteredAttendance.length === 0 ? (
              <EmptyState message="No matching attendance records found." />
            ) : (
              filteredAttendance.map((item) => (
                <View key={String(item.id)} style={styles.recordRow}>
                  <View style={[styles.avatar, { backgroundColor: '#F0E9FF' }]}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={21}
                      color="#8656C8"
                    />
                  </View>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordTitle}>
                      {item.student_name || item.full_name || 'Student'}
                    </Text>
                    <Text style={styles.recordSubtitle}>
                      Event: {item.event_name || 'Event not specified'}
                    </Text>
                    <Text style={styles.recordMeta}>
                      Status: {item.status || 'Recorded'}
                    </Text>
                    {item.created_at ? (
                      <Text style={styles.recordMeta}>
                        Date: {new Date(item.created_at).toLocaleString()}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        <Pressable style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
          <Text style={styles.refreshButtonText}>Refresh Dashboard</Text>
        </Pressable>

        <Text style={styles.footer}>QR Attendance • Admin Panel</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  onPress,
}: {
  title: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.statCard} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={23} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      <Ionicons
        name="arrow-forward-circle-outline"
        size={19}
        color={COLORS.muted}
        style={styles.statArrow}
      />
    </Pressable>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="file-tray-outline" size={34} color={COLORS.muted} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.muted,
    fontSize: 14,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    gap: 12,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.primaryDark,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 3,
  },
  title: {
    color: COLORS.text,
    fontSize: 23,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  logoutButton: {
    width: 43,
    height: 43,
    backgroundColor: '#FCEAE8',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 23,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  welcomeText: {
    flex: 1,
    paddingRight: 10,
  },
  welcomeLabel: {
    color: '#E8F6FF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 7,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
  },
  welcomeSubtitle: {
    color: '#F0F9FF',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 13,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 25,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '42%',
    minHeight: 145,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
  },
  statIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 27,
    fontWeight: '800',
  },
  statTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  statArrow: {
    position: 'absolute',
    right: 14,
    top: 15,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  tab: {
    flexGrow: 1,
    flexBasis: '40%',
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  searchBox: {
    height: 48,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  panel: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 17,
    marginBottom: 18,
  },
  panelHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  panelTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  summaryRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  helperText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  recordSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  recordMeta: {
    color: COLORS.primaryDark,
    fontSize: 11,
    marginTop: 5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FFF0EE',
    borderWidth: 1,
    borderColor: '#F4C8C2',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginBottom: 18,
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 5,
  },
  errorText: {
    color: '#82352E',
    fontSize: 12,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
  },
  retryText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  refreshButton: {
    minHeight: 49,
    backgroundColor: COLORS.primaryDark,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: 11,
    marginTop: 22,
  },
});