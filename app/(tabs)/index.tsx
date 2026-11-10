
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

type EventItem = {
  id: string;
  title: string;
  date: string | null;
  location: string;
};

const C = {
  background: '#EDF5FC',
  white: '#FFFFFF',
  blue: '#3188C8',
  blueDark: '#205D87',
  blueLight: '#E1F1FF',
  blueSoft: '#F6FAFE',
  border: '#D8E7F3',
  text: '#203C50',
  muted: '#7A92A5',
  green: '#319875',
  greenLight: '#E8F6EF',
};

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fullName, setFullName] = useState('Student');
  const [role, setRole] = useState('Student');
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [eventCount, setEventCount] = useState(0);

  const loadHome = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.log('Profile loading error:', profileError.message);
      }

      if (profile?.full_name) {
        setFullName(profile.full_name);
      } else {
        setFullName(
          session.user.email?.split('@')[0] ?? 'Student'
        );
      }

      if (profile?.role) {
        setRole(profile.role);
      }

      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .limit(50);

      if (eventsError) {
        console.log('Events loading error:', eventsError.message);
        setUpcomingEvents([]);
        setEventCount(0);
        return;
      }

      const now = new Date();

      const formattedEvents: EventItem[] = (events ?? [])
        .map((event: any) => {
          const rawDate =
            event.start ??
            event.start_date ??
            event.event_date ??
            event.date ??
            null;

          return {
            id: String(event.id ?? event.eventId ?? Math.random()),
            title:
              event.title ??
              event.event_title ??
              event.name ??
              'School Event',
            date: rawDate ? String(rawDate) : null,
            location:
              event.location ??
              event.venue ??
              'School Activity',
          };
        })
        .filter((event) => {
          if (!event.date) return true;

          const eventDate = new Date(event.date);
          return (
            Number.isNaN(eventDate.getTime()) ||
            eventDate >= now
          );
        })
        .sort((a, b) => {
          if (!a.date) return 1;
          if (!b.date) return -1;

          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();

          if (Number.isNaN(dateA)) return 1;
          if (Number.isNaN(dateB)) return -1;

          return dateA - dateB;
        });

      setEventCount(formattedEvents.length);
      setUpcomingEvents(formattedEvents.slice(0, 5));
    } catch (error) {
      console.log('Home loading error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id, session?.user?.email]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadHome();
    }, [loadHome])
  );

  const refresh = () => {
    setRefreshing(true);
    loadHome();
  };

  const greeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Date to be announced';

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return parsedDate.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={C.background}
        />
        <View style={styles.loadingIcon}>
          <Ionicons
            name="qr-code"
            size={38}
            color={C.blue}
          />
        </View>
        <ActivityIndicator
          size="large"
          color={C.blue}
          style={styles.loader}
        />
        <Text style={styles.loadingText}>
          Preparing your dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.background}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={C.blue}
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <View style={styles.logo}>
              <Ionicons
                name="qr-code"
                size={25}
                color={C.white}
              />
            </View>

            <View>
              <Text style={styles.brandTitle}>
                QR Attendance
              </Text>
              <Text style={styles.brandSubtitle}>
                SCHOOL EVENT MANAGEMENT
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.profileButton}
            onPress={() => router.push('/profile' as never)}
          >
            <Ionicons
              name="person-outline"
              size={22}
              color={C.blueDark}
            />
          </Pressable>
        </View>

        {/* WELCOME */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greetingText}>
            {greeting()} 👋
          </Text>

          <Text style={styles.welcomeTitle}>
            Hello, {fullName}!
          </Text>

          <Text style={styles.welcomeDescription}>
            Ready to make your attendance count today?
          </Text>

          <View style={styles.roleBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={C.blue}
            />
            <Text style={styles.roleText}>{role}</Text>
          </View>
        </View>

        {/* SCANNER CARD */}
        <View style={styles.scannerCard}>
          <View style={styles.scannerTextContainer}>
            <View style={styles.scannerLabel}>
              <View style={styles.statusDot} />
              <Text style={styles.scannerLabelText}>
                QUICK ATTENDANCE
              </Text>
            </View>

            <Text style={styles.scannerTitle}>
              Scan. Attend. Done.
            </Text>

            <Text style={styles.scannerDescription}>
              Scan your event QR code to record your
              attendance in seconds.
            </Text>
          </View>

          <View style={styles.scannerIllustration}>
            <Ionicons
              name="scan-outline"
              size={70}
              color={C.blue}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.scanButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/scan' as never)}
          >
            <Ionicons
              name="qr-code-outline"
              size={22}
              color={C.white}
            />
            <Text style={styles.scanButtonText}>
              Scan QR Code
            </Text>
            <Ionicons
              name="arrow-forward"
              size={19}
              color={C.white}
            />
          </Pressable>
        </View>

        {/* OVERVIEW */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Your Overview
            </Text>
            <Text style={styles.sectionSubtitle}>
              A quick look at your activities
            </Text>
          </View>

          <View style={styles.sectionIcon}>
            <Ionicons
              name="stats-chart-outline"
              size={22}
              color={C.blue}
            />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconBlue}>
              <Ionicons
                name="calendar-outline"
                size={23}
                color={C.blue}
              />
            </View>

            <Text style={styles.statNumber}>
              {eventCount}
            </Text>
            <Text style={styles.statLabel}>
              Upcoming Events
            </Text>
            <Text style={styles.statHint}>
              Scheduled activities
            </Text>
          </View>

          <Pressable
            style={styles.statCard}
            onPress={() => router.push('/history' as never)}
          >
            <View style={styles.statIconGreen}>
              <Ionicons
                name="time-outline"
                size={23}
                color={C.green}
              />
            </View>

            <Text style={styles.statNumber}>
              <Ionicons
                name="arrow-forward-circle-outline"
                size={25}
                color={C.green}
              />
            </Text>
            <Text style={styles.statLabel}>
              Attendance History
            </Text>
            <Text style={styles.statHint}>
              View your records
            </Text>
          </Pressable>
        </View>

        {/* UPCOMING EVENTS */}
        <View style={styles.eventsHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Upcoming Events
            </Text>
            <Text style={styles.sectionSubtitle}>
              Don't miss your school activities
            </Text>
          </View>

          <View style={styles.calendarIcon}>
            <Ionicons
              name="calendar"
              size={22}
              color={C.blue}
            />
          </View>
        </View>

        {upcomingEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-clear-outline"
                size={35}
                color={C.blue}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No upcoming events
            </Text>

            <Text style={styles.emptyDescription}>
              Your scheduled school events will appear here
              when they become available.
            </Text>

            <Pressable
              style={styles.refreshButton}
              onPress={refresh}
            >
              <Ionicons
                name="refresh"
                size={17}
                color={C.blue}
              />
              <Text style={styles.refreshText}>
                Refresh events
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {upcomingEvents.map((event) => (
              <View
                key={event.id}
                style={styles.eventCard}
              >
                <View style={styles.eventDateIcon}>
                  <Ionicons
                    name="calendar"
                    size={23}
                    color={C.blue}
                  />
                </View>

                <View style={styles.eventDetails}>
                  <Text
                    style={styles.eventTitle}
                    numberOfLines={2}
                  >
                    {event.title}
                  </Text>

                  <View style={styles.eventMeta}>
                    <Ionicons
                      name="time-outline"
                      size={15}
                      color={C.muted}
                    />
                    <Text style={styles.eventDate}>
                      {formatDate(event.date)}
                    </Text>
                  </View>

                  <View style={styles.eventMeta}>
                    <Ionicons
                      name="location-outline"
                      size={15}
                      color={C.muted}
                    />
                    <Text
                      style={styles.eventLocation}
                      numberOfLines={1}
                    >
                      {event.location}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={C.muted}
                />
              </View>
            ))}
          </View>
        )}

        {/* TIP CARD */}
        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons
              name="bulb-outline"
              size={24}
              color={C.blue}
            />
          </View>

          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>
              Attendance Tip
            </Text>
            <Text style={styles.tipDescription}>
              Keep your camera ready and make sure the
              event QR code is clearly visible before
              scanning.
            </Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Ionicons
            name="heart"
            size={13}
            color={C.blue}
          />
          <Text style={styles.footerText}>
            Made for better school attendance
          </Text>
          <View style={styles.footerLine} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 35,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: C.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIcon: {
    width: 78,
    height: 78,
    borderRadius: 25,
    backgroundColor: C.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loader: {
    marginTop: 5,
  },
  loadingText: {
    color: C.muted,
    fontSize: 14,
    marginTop: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 27,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    backgroundColor: C.blue,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: C.blueDark,
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: C.muted,
    letterSpacing: 1.1,
    marginTop: 4,
  },
  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeSection: {
    marginBottom: 24,
  },
  greetingText: {
    color: C.blue,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 7,
  },
  welcomeTitle: {
    color: C.text,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.9,
  },
  welcomeDescription: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.blueLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 13,
  },
  roleText: {
    color: C.blueDark,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  scannerCard: {
    backgroundColor: C.white,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: C.border,
    padding: 19,
    marginBottom: 29,
    shadowColor: C.blueDark,
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  scannerTextContainer: {
    marginBottom: 12,
  },
  scannerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  scannerLabelText: {
    color: C.blue,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  scannerTitle: {
    color: C.blueDark,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  scannerDescription: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 270,
  },
  scannerIllustration: {
    position: 'absolute',
    right: 18,
    top: 62,
    width: 88,
    height: 88,
    borderRadius: 25,
    backgroundColor: C.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.95,
  },
  scanButton: {
    backgroundColor: C.blue,
    borderRadius: 16,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 16,
    shadowColor: C.blue,
    shadowOpacity: 0.2,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  scanButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
  sectionIcon: {
    width: 43,
    height: 43,
    backgroundColor: C.blueLight,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
    minHeight: 164,
  },
  statIconBlue: {
    width: 43,
    height: 43,
    backgroundColor: C.blueLight,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statIconGreen: {
    width: 43,
    height: 43,
    backgroundColor: C.greenLight,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statNumber: {
    color: C.blueDark,
    fontSize: 27,
    fontWeight: '800',
    minHeight: 32,
  },
  statLabel: {
    color: C.text,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 5,
  },
  statHint: {
    color: C.muted,
    fontSize: 10,
    marginTop: 5,
    lineHeight: 15,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  calendarIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: C.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 23,
    padding: 24,
    alignItems: 'center',
    marginBottom: 25,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 23,
    backgroundColor: C.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  emptyTitle: {
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
  },
  emptyDescription: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 260,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: C.blueLight,
    marginTop: 16,
  },
  refreshText: {
    color: C.blueDark,
    fontSize: 12,
    fontWeight: '800',
  },
  eventsList: {
    gap: 12,
    marginBottom: 25,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.white,
    borderRadius: 19,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  eventDateIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: C.blueLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDetails: {
    flex: 1,
    gap: 7,
  },
  eventTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: '800',
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventDate: {
    color: C.muted,
    fontSize: 11,
  },
  eventLocation: {
    color: C.muted,
    fontSize: 11,
    flexShrink: 1,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    backgroundColor: C.blueLight,
    borderRadius: 21,
    padding: 17,
    marginBottom: 28,
  },
  tipIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    color: C.blueDark,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 5,
  },
  tipDescription: {
    color: '#587991',
    fontSize: 12,
    lineHeight: 19,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginBottom: 5,
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  footerText: {
    color: C.muted,
    fontSize: 10,
  },
});
