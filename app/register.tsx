import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

type UserRole = 'student' | 'teacher';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (loading) return;

    Keyboard.dismiss();
    setError('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await signUp(
        cleanEmail,
        password,
        {
          full_name: cleanName,
          role,
        }
      );

      if (authError) {
        setError(authError.message || 'Registration failed. Please try again.');
        return;
      }

      if (data?.session) {
        router.replace('/(tabs)');
        return;
      }

      // Supabase may require email confirmation before sign-in.
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Ionicons
                    name="qr-code-outline"
                    size={34}
                    color={COLORS.primary}
                  />
                </View>

                <Header title="QR Attendance" />
              </View>

              <View style={styles.titleContainer}>
                <Text style={styles.title}>
                  {success ? 'Almost There!' : 'Create Account'}
                </Text>

                <Text style={styles.subtitle}>
                  {success
                    ? 'Verify your email to complete your registration.'
                    : 'Create your account to start recording school event attendance.'}
                </Text>
              </View>

              {success ? (
                <View style={styles.successCard}>
                  <View style={styles.successIcon}>
                    <Ionicons
                      name="mail-open-outline"
                      size={34}
                      color={COLORS.primary}
                    />
                  </View>

                  <Text style={styles.successTitle}>
                    Check Your Email
                  </Text>

                  <Text style={styles.successText}>
                    If email confirmation is enabled, open the confirmation
                    link sent to:
                  </Text>

                  <Text style={styles.emailText}>{email.trim()}</Text>

                  <Text style={styles.successText}>
                    After confirming your account, return here and sign in.
                  </Text>

                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => router.replace('/login')}
                  >
                    <Text style={styles.primaryButtonText}>
                      Go to Sign In
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color="#FFFFFF"
                    />
                  </Pressable>
                </View>
              ) : (
                <View>
                  <Text style={styles.label}>Full Name</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="person-outline"
                      size={19}
                      color={COLORS.textSecondary}
                    />
                    <TextInput
                      style={styles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Enter your full name"
                      placeholderTextColor={COLORS.textSecondary}
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!loading}
                      returnKeyType="next"
                    />
                  </View>

                  <Text style={styles.label}>Email Address</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="mail-outline"
                      size={19}
                      color={COLORS.textSecondary}
                    />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="your.email@school.edu"
                      placeholderTextColor={COLORS.textSecondary}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      editable={!loading}
                      returnKeyType="next"
                    />
                  </View>

                  <Text style={styles.label}>Password</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={19}
                      color={COLORS.textSecondary}
                    />

                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="At least 6 characters"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                      editable={!loading}
                      returnKeyType="next"
                    />

                    <Pressable
                      onPress={() => setShowPassword((previous) => !previous)}
                      hitSlop={10}
                      accessibilityLabel={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={21}
                        color={COLORS.textSecondary}
                      />
                    </Pressable>
                  </View>

                  <Text style={styles.label}>Confirm Password</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={19}
                      color={COLORS.textSecondary}
                    />

                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter your password"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                      editable={!loading}
                      returnKeyType="done"
                      onSubmitEditing={handleRegister}
                    />

                    <Pressable
                      onPress={() =>
                        setShowConfirmPassword((previous) => !previous)
                      }
                      hitSlop={10}
                      accessibilityLabel={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                    >
                      <Ionicons
                        name={
                          showConfirmPassword
                            ? 'eye-off-outline'
                            : 'eye-outline'
                        }
                        size={21}
                        color={COLORS.textSecondary}
                      />
                    </Pressable>
                  </View>

                  <Text style={styles.label}>I am a...</Text>

                  <View style={styles.roleContainer}>
                    <Pressable
                      disabled={loading}
                      onPress={() => setRole('student')}
                      style={[
                        styles.roleButton,
                        role === 'student' && styles.roleButtonActive,
                      ]}
                    >
                      <Ionicons
                        name="school-outline"
                        size={23}
                        color={
                          role === 'student'
                            ? COLORS.primary
                            : COLORS.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.roleText,
                          role === 'student' && styles.roleTextActive,
                        ]}
                      >
                        Student
                      </Text>

                      {role === 'student' && (
                        <Ionicons
                          name="checkmark-circle"
                          size={17}
                          color={COLORS.primary}
                        />
                      )}
                    </Pressable>

                    <Pressable
                      disabled={loading}
                      onPress={() => setRole('teacher')}
                      style={[
                        styles.roleButton,
                        role === 'teacher' && styles.roleButtonActive,
                      ]}
                    >
                      <Ionicons
                        name="person-circle-outline"
                        size={23}
                        color={
                          role === 'teacher'
                            ? COLORS.primary
                            : COLORS.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.roleText,
                          role === 'teacher' && styles.roleTextActive,
                        ]}
                      >
                        Teacher
                      </Text>

                      {role === 'teacher' && (
                        <Ionicons
                          name="checkmark-circle"
                          size={17}
                          color={COLORS.primary}
                        />
                      )}
                    </Pressable>
                  </View>

                  {error ? (
                    <View style={styles.errorContainer}>
                      <Ionicons
                        name="alert-circle-outline"
                        size={20}
                        color="#B3261E"
                      />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <Pressable
                    style={[
                      styles.primaryButton,
                      loading && styles.disabledButton,
                    ]}
                    onPress={handleRegister}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.primaryButtonText}>
                          Create Account
                        </Text>
                        <Ionicons
                          name="arrow-forward"
                          size={19}
                          color="#FFFFFF"
                        />
                      </>
                    )}
                  </Pressable>

                  <Text style={styles.termsText}>
                    By creating an account, make sure you use an email address
                    you can access.
                  </Text>
                </View>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {success
                    ? 'Already confirmed your email?'
                    : 'Already have an account?'}
                </Text>

                <Link href="/login" style={styles.link}>
                  Sign In
                </Link>
              </View>
            </View>

            <Text style={styles.bottomText}>
              QR Attendance {'\u2022'} School Event Management
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAF5FF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.card || '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D6E8F8',
    shadowColor: '#164A72',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#DCEEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary || '#172B3A',
    marginBottom: 7,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary || '#617587',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary || '#172B3A',
    marginBottom: 7,
    marginTop: 14,
  },
  inputContainer: {
    minHeight: 51,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5FAFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E5F2',
    paddingHorizontal: 13,
    gap: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 13,
    fontSize: 14,
    color: COLORS.textPrimary || '#172B3A',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 3,
  },
  roleButton: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#D6E5F2',
    borderRadius: 13,
    backgroundColor: '#F5FAFF',
  },
  roleButtonActive: {
    backgroundColor: '#E4F2FF',
    borderColor: '#4B9DE5',
    borderWidth: 1.5,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary || '#617587',
  },
  roleTextActive: {
    color: COLORS.primary || '#2476B9',
    fontWeight: '800',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF0F0',
    borderColor: '#FFD6D6',
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    marginTop: 15,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#B3261E',
  },
  primaryButton: {
    minHeight: 52,
    marginTop: 22,
    paddingHorizontal: 18,
    borderRadius: 13,
    backgroundColor: COLORS.primary || '#2476B9',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  disabledButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.textSecondary || '#617587',
    textAlign: 'center',
    marginTop: 12,
  },
  successCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#D6E8F8',
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCEEFF',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary || '#172B3A',
    marginBottom: 10,
  },
  successText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary || '#617587',
    textAlign: 'center',
  },
  emailText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary || '#2476B9',
    textAlign: 'center',
    marginVertical: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 22,
    paddingTop: 17,
    borderTopWidth: 1,
    borderTopColor: '#E5EDF5',
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textSecondary || '#617587',
  },
  link: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary || '#2476B9',
  },
  bottomText: {
    marginTop: 18,
    fontSize: 11,
    textAlign: 'center',
    color: '#617587',
  },
});