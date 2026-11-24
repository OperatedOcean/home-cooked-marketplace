import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Image,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './utils/supabase';

const meals = [
  {
    id: 1,
    name: 'Homemade Chicken and Rice',
    cook: 'Sarah',
    price: 12.99,
    description: 'Tender chicken served with seasoned rice and vegetables.',
    category: 'American',
  },
  {
    id: 2,
    name: 'Turkish Manti',
    cook: 'Ayse',
    price: 14.99,
    description: 'Traditional Turkish dumplings with yogurt and garlic sauce.',
    category: 'Turkish',
  },
  {
    id: 3,
    name: 'Fresh Homemade Lasagna',
    cook: 'Maria',
    price: 15.99,
    description: 'Layers of pasta, homemade tomato sauce, and melted cheese.',
    category: 'Italian',
  },
  {
    id: 4,
    name: 'Chicken Biryani',
    cook: 'Aisha',
    price: 13.99,
    description: 'Fragrant basmati rice cooked with chicken and aromatic spices.',
    category: 'Indian',
  },
  {
    id: 5,
    name: 'Beef Tacos',
    cook: 'Sofia',
    price: 10.99,
    description: 'Fresh tortillas filled with seasoned beef and vegetables.',
    category: 'Mexican',
  },
];

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [isCook, setIsCook] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          setSession(nextSession);
          setReady(true);
        }
      );

    return () => subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    let active = true;

    setProfileReady(false);
    setAvatarUrl('');
    setFullName('');
    setBio('');
    setLocation('');
    setIsCook(false);

    if (userId) {
      supabase
        .from('profiles')
        .select('full_name,bio,location,is_cook,avatar_url')
        .eq('id', userId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!active) return;

          if (error) {
            Alert.alert('Profile error', error.message);
            return;
          }

          setAvatarUrl(data?.avatar_url ?? '');
          setFullName(data?.full_name ?? '');
          setBio(data?.bio ?? '');
          setLocation(data?.location ?? '');
          setIsCook(data?.is_cook ?? false);
          setProfileReady(true);
        });
    }

    return () => {
      active = false;
    };
  }, [userId]);

  async function authenticate(signUp: boolean) {
    if (!email.trim() || !password) {
      Alert.alert('Enter your email and password');
      return;
    }

    setBusy(true);

    try {
      const credentials = {
        email: email.trim(),
        password,
      };

      const { data, error } = signUp
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);

      if (error) throw error;

      setPassword('');

      if (signUp && !data.session) {
        Alert.alert(
          'Check your email',
          'Confirm your email address, then return here to log in.'
        );

        setCurrentScreen('login');
      } else {
        setCurrentScreen('profile');
      }
    } catch (error) {
      Alert.alert(
        'Authentication error',
        error instanceof Error
          ? error.message
          : String((error as { message?: string })?.message ?? error)
      );
    } finally {
      setBusy(false);
    }
  }

  async function chooseProfilePicture() {
    if (!userId || !profileReady || busy) return;

    setBusy(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      if (!asset.base64) {
        throw new Error('Could not read the selected image.');
      }

      const bytes = decode(asset.base64);

      if (bytes.byteLength > 5 * 1024 * 1024) {
        throw new Error('Please choose an image smaller than 5 MB.');
      }

      const path = `${userId}/avatar-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, bytes, {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          avatar_url: data.publicUrl,
        });

      if (profileError) {
        await supabase.storage
          .from('avatars')
          .remove([path]);

        throw profileError;
      }

      setAvatarUrl(data.publicUrl);

      const prefix = '/storage/v1/object/public/avatars/';
      const oldPath = avatarUrl.split(prefix)[1];

      if (oldPath && oldPath.startsWith(`${userId}/`)) {
        await supabase.storage
          .from('avatars')
          .remove([oldPath]);
      }

      Alert.alert('Profile picture saved');
    } catch (error) {
      Alert.alert(
        'Picture upload failed',
        error instanceof Error
          ? error.message
          : String((error as { message?: string })?.message ?? error)
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    if (!userId || !profileReady || busy) return;

    setBusy(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: fullName.trim(),
          bio,
          location,
          is_cook: isCook,
        });

      if (error) throw error;

      Alert.alert('Profile saved');
      setCurrentScreen('profile');
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error
          ? error.message
          : String((error as { message?: string })?.message ?? error)
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setCurrentScreen('home');
    } catch (error) {
      Alert.alert(
        'Logout failed',
        error instanceof Error
          ? error.message
          : String((error as { message?: string })?.message ?? error)
      );
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <SafeAreaView style={styles.homeContent}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (
    currentScreen === 'login' ||
    currentScreen === 'signup' ||
    (
      (currentScreen === 'profile' ||
        currentScreen === 'edit-profile') &&
      !session
    )
  ) {
    const signUp = currentScreen === 'signup';

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView
          contentContainerStyle={styles.detailsContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('home')}
          >
            <Text style={styles.backButtonText}>
              Back to Home
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {signUp ? 'Create Account' : 'Log In'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={styles.button}
            disabled={busy}
            onPress={() => authenticate(signUp)}
          >
            <Text style={styles.buttonText}>
              {busy
                ? 'Please wait...'
                : signUp
                ? 'Create Account'
                : 'Log In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            disabled={busy}
            onPress={() =>
              setCurrentScreen(signUp ? 'login' : 'signup')
            }
          >
            <Text style={styles.secondaryButtonText}>
              {signUp
                ? 'Already have an account? Log In'
                : 'New here? Create Account'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (
    currentScreen === 'profile' ||
    currentScreen === 'edit-profile'
  ) {
    const editing = currentScreen === 'edit-profile';

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView
          contentContainerStyle={styles.detailsContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            disabled={busy}
            onPress={() => setCurrentScreen('home')}
          >
            <Text style={styles.backButtonText}>
              Back to Home
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {editing ? 'Edit Profile' : 'My Profile'}
          </Text>

          <Text style={styles.subtitle}>
            {session?.user.email}
          </Text>

          {profileReady && (
            <View style={styles.avatarSection}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarPlaceholder,
                  ]}
                >
                  <Text style={styles.avatarInitial}>
                    {(fullName.trim() ||
                      session?.user.email ||
                      'U')
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}

              {editing && (
                <TouchableOpacity
                  disabled={busy}
                  onPress={chooseProfilePicture}
                >
                  <Text style={styles.avatarButton}>
                    {busy
                      ? 'Please wait...'
                      : avatarUrl
                      ? 'Change Profile Picture'
                      : 'Add Profile Picture'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!profileReady ? (
            <Text style={styles.noticeText}>
              Profile not loaded. If loading failed,
              log out and try again.
            </Text>
          ) : editing ? (
            <View style={styles.card}>
              <Text style={styles.detailLabel}>
                Full Name
              </Text>

              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
              />

              <Text style={styles.detailLabel}>
                Bio
              </Text>

              <TextInput
                style={styles.input}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                multiline
              />

              <Text style={styles.detailLabel}>
                Location
              </Text>

              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="City"
              />

              <Text style={styles.detailLabel}>
                I am a home cook
              </Text>

              <Switch
                value={isCook}
                onValueChange={setIsCook}
              />

              <TouchableOpacity
                style={[
                  styles.button,
                  { marginTop: 20 },
                ]}
                disabled={busy}
                onPress={saveProfile}
              >
                <Text style={styles.buttonText}>
                  {busy ? 'Please wait...' : 'Save Profile'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {fullName || 'Your Profile'}
              </Text>

              <Text style={styles.detailLabel}>
                Bio
              </Text>

              <Text style={styles.detailValue}>
                {bio || 'Not added yet'}
              </Text>

              <Text style={styles.detailLabel}>
                Location
              </Text>

              <Text style={styles.detailValue}>
                {location || 'Not added yet'}
              </Text>

              <Text style={styles.detailLabel}>
                Account Type
              </Text>

              <Text style={styles.detailValue}>
                {isCook ? 'Home Cook' : 'Customer'}
              </Text>

              <TouchableOpacity
                style={styles.button}
                disabled={busy}
                onPress={() =>
                  setCurrentScreen('edit-profile')
                }
              >
                <Text style={styles.buttonText}>
                  Edit Profile
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            disabled={busy}
            onPress={logout}
          >
            <Text style={styles.secondaryButtonText}>
              Log Out
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'meals') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.mealsContent}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentScreen('home')}
          >
            <Text style={styles.backButtonText}>
              Back to Home
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            Explore Homemade Meals
          </Text>

          <Text style={styles.subtitle}>
            Discover fresh, delicious meals prepared by
            home cooks in your community.
          </Text>

          <Text style={styles.sectionTitle}>
            Available Meals
          </Text>

          {meals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealName}>
                  {meal.name}
                </Text>

                <Text style={styles.mealPrice}>
                  ${meal.price.toFixed(2)}
                </Text>
              </View>

              <Text style={styles.mealCategory}>
                {meal.category}
              </Text>

              <Text style={styles.mealDescription}>
                {meal.description}
              </Text>

              <Text style={styles.mealCook}>
                Prepared by {meal.cook}
              </Text>

              <TouchableOpacity
                style={styles.viewButton}
                onPress={() =>
                  setCurrentScreen(`meal-${meal.id}`)
                }
              >
                <Text style={styles.viewButtonText}>
                  View Details
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (currentScreen.startsWith('meal-')) {
    const mealId = Number(
      currentScreen.replace('meal-', '')
    );

    const selectedMeal = meals.find(
      (meal) => meal.id === mealId
    );

    if (selectedMeal) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar style="dark" />

          <ScrollView
            contentContainerStyle={styles.detailsContent}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentScreen('meals')}
            >
              <Text style={styles.backButtonText}>
                Back to Meals
              </Text>
            </TouchableOpacity>

            <Text style={styles.title}>
              {selectedMeal.name}
            </Text>

            <View style={styles.card}>
              <Text style={styles.detailLabel}>
                Price
              </Text>

              <Text style={styles.detailValue}>
                ${selectedMeal.price.toFixed(2)}
              </Text>

              <Text style={styles.detailLabel}>
                Category
              </Text>

              <Text style={styles.detailValue}>
                {selectedMeal.category}
              </Text>

              <Text style={styles.detailLabel}>
                Description
              </Text>

              <Text style={styles.detailValue}>
                {selectedMeal.description}
              </Text>

              <Text style={styles.detailLabel}>
                Home Cook
              </Text>

              <Text style={styles.detailValue}>
                {selectedMeal.cook}
              </Text>
            </View>

            <Text style={styles.noticeText}>
              Ordering functionality is coming soon.
            </Text>
          </ScrollView>
        </SafeAreaView>
      );
    }
  }

  if (currentScreen === 'cook') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <View style={styles.homeContent}>
          <Text style={styles.title}>
            Become a Home Cook
          </Text>

          <Text style={styles.subtitle}>
            Share your homemade meals with people in
            your community and earn additional income.
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Start Selling Your Meals
            </Text>

            <Text style={styles.cardText}>
              Soon, home cooks will be able to create
              profiles, list homemade dishes, and
              connect with customers.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setCurrentScreen('home')}
          >
            <Text style={styles.buttonText}>
              Back to Home
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.homeContent}>
        <Text style={styles.title}>
          Home-Cooked Marketplace
        </Text>

        <Text style={styles.subtitle}>
          Discover delicious homemade meals from
          local home cooks.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Welcome!
          </Text>

          <Text style={styles.cardText}>
            Find homemade meals or share your cooking
            with your community.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setCurrentScreen('meals')}
        >
          <Text style={styles.buttonText}>
            Explore Meals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            setCurrentScreen(session ? 'profile' : 'login')
          }
        >
          <Text style={styles.buttonText}>
            {session
              ? 'My Profile'
              : 'Log In / Create Account'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setCurrentScreen('cook')}
        >
          <Text style={styles.secondaryButtonText}>
            Become a Home Cook
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3EAE3',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#2D4934',
  },
  avatarButton: {
    marginTop: 14,
    color: '#2D4934',
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DDD5',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#2D4934',
    marginBottom: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF9F2',
  },
  homeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scrollView: {
    flex: 1,
  },
  mealsContent: {
    padding: 24,
    paddingBottom: 40,
  },
  detailsContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#2D4934',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D4934',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 16,
    color: '#555555',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#2D4934',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderColor: '#2D4934',
    borderWidth: 2,
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2D4934',
    fontSize: 17,
    fontWeight: 'bold',
  },
  backButton: {
    marginBottom: 24,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#2D4934',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D4934',
    marginBottom: 20,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mealName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D4934',
    flex: 1,
    marginRight: 12,
  },
  mealPrice: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2D4934',
  },
  mealCategory: {
    fontSize: 13,
    color: '#777777',
    marginBottom: 12,
  },
  mealDescription: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 22,
    marginBottom: 12,
  },
  mealCook: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 16,
  },
  viewButton: {
    backgroundColor: '#2D4934',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2D4934',
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 16,
    color: '#555555',
    lineHeight: 24,
    marginBottom: 20,
  },
  noticeText: {
    fontSize: 15,
    color: '#777777',
    textAlign: 'center',
  },
});