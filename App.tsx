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

type Listing = {
  id: string;
  cook_id: string;
  title: string;
  description: string;
  price: number;
  portions: number;
  image_url: string | null;
  location: string;
  is_available: boolean;
};

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

  const [listings, setListings] = useState<Listing[]>([]);
  const [listingError, setListingError] = useState('');
  const [loadingListings, setLoadingListings] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mealTitle, setMealTitle] = useState('');
  const [mealDescription, setMealDescription] = useState('');
  const [mealPrice, setMealPrice] = useState('');
  const [mealPortions, setMealPortions] = useState('');
  const [mealLocation, setMealLocation] = useState('');
  const [mealImage, setMealImage] = useState('');
  const [mealBase64, setMealBase64] = useState('');
  const [available, setAvailable] = useState(true);
  const [detailsBack, setDetailsBack] = useState('meals');

  const userId = session?.user.id;

  function errorMessage(error: unknown) {
    return error instanceof Error
      ? error.message
      : String(
          (error as { message?: string })?.message ?? error
        );
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setReady(true);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;

    setProfileReady(false);
    setAvatarUrl('');
    setFullName('');
    setBio('');
    setLocation('');
    setIsCook(false);
    setListings([]);

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

  useEffect(() => {
    if (
      userId &&
      (currentScreen === 'meals' ||
        currentScreen === 'my-listings')
    ) {
      void loadListings();
    }
  }, [currentScreen, userId]);

  async function loadListings() {
    if (!userId) return;

    setLoadingListings(true);
    setListingError('');

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setListings(data ?? []);
    } catch (error) {
      setListings([]);
      setListingError(errorMessage(error));
    } finally {
      setLoadingListings(false);
    }
  }

  function openListingForm(item?: Listing) {
    setEditingId(item?.id ?? null);
    setMealTitle(item?.title ?? '');
    setMealDescription(item?.description ?? '');
    setMealPrice(item ? String(item.price) : '');
    setMealPortions(item ? String(item.portions) : '');
    setMealLocation(item?.location ?? location);
    setMealImage(item?.image_url ?? '');
    setMealBase64('');
    setAvailable(item?.is_available ?? true);
    setCurrentScreen('listing-form');
  }

  async function chooseMealImage() {
    if (busy) return;

    setBusy(true);

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.6,
          base64: true,
        });

      if (result.canceled) return;

      const asset = result.assets[0];

      if (!asset.base64) {
        throw new Error('Could not read the image.');
      }

      if (
        decode(asset.base64).byteLength >
        5 * 1024 * 1024
      ) {
        throw new Error('Choose an image smaller than 5 MB.');
      }

      setMealBase64(asset.base64);
      setMealImage(asset.uri);
    } catch (error) {
      Alert.alert('Image error', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function saveListing() {
    if (!userId || !profileReady || !isCook || busy) {
      return;
    }

    const price = Number(mealPrice);
    const portions = Number(mealPortions);

    if (
      !mealTitle.trim() ||
      !mealDescription.trim() ||
      !mealLocation.trim() ||
      !mealPrice.trim() ||
      !mealPortions.trim() ||
      !Number.isFinite(price) ||
      price < 0.01 ||
      price > 99999999.99 ||
      !/^\d+(\.\d{1,2})?$/.test(mealPrice.trim()) ||
      !Number.isInteger(portions) ||
      portions < 0 ||
      portions > 2147483647 ||
      (!editingId && portions === 0)
    ) {
      Alert.alert(
        'Check your listing',
        'Enter a title, description, location, valid price and whole number of portions.'
      );
      return;
    }

    setBusy(true);

    let uploadedPath = '';

    try {
      let imageUrl = mealImage || null;

      const previousListing = listings.find(
        (item) => item.id === editingId
      );

      if (mealBase64) {
        const path =
          `${userId}/meal-${Date.now()}.jpg`;

        const { error } = await supabase.storage
          .from('food-images')
          .upload(path, decode(mealBase64), {
            contentType: 'image/jpeg',
          });

        if (error) throw error;

        uploadedPath = path;

        imageUrl = supabase.storage
          .from('food-images')
          .getPublicUrl(path).data.publicUrl;
      }

      const values = {
        cook_id: userId,
        title: mealTitle.trim(),
        description: mealDescription.trim(),
        price,
        portions,
        location: mealLocation.trim(),
        image_url: imageUrl,
        is_available: available && portions > 0,
      };

      const query = editingId
        ? supabase
            .from('listings')
            .update(values)
            .eq('id', editingId)
            .eq('cook_id', userId)
        : supabase
            .from('listings')
            .insert(values);

      const { error } = await query
        .select('id')
        .single();

      if (error) throw error;

      uploadedPath = '';

      if (mealBase64 && previousListing?.image_url) {
        const oldPath = previousListing.image_url.split(
          '/storage/v1/object/public/food-images/'
        )[1];

        if (oldPath?.startsWith(`${userId}/`)) {
          await supabase.storage
            .from('food-images')
            .remove([oldPath]);
        }
      }

      setMealBase64('');
      setMealImage('');

      Alert.alert(
        editingId ? 'Listing updated' : 'Listing published',
        'Your food listing has been saved successfully.'
      );

      setCurrentScreen('my-listings');
    } catch (error) {
      if (uploadedPath) {
        await supabase.storage
          .from('food-images')
          .remove([uploadedPath]);
      }

      Alert.alert('Save failed', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function deleteListing(item: Listing) {
    Alert.alert(
      'Delete listing?',
      `Are you sure you want to delete ${item.title}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (
              !userId ||
              item.cook_id !== userId ||
              busy
            ) {
              return;
            }

            setBusy(true);

            try {
              const { error } = await supabase
                .from('listings')
                .delete()
                .eq('id', item.id)
                .eq('cook_id', userId)
                .select('id')
                .single();

              if (error) throw error;

              const path = item.image_url?.split(
                '/storage/v1/object/public/food-images/'
              )[1];

              if (path?.startsWith(`${userId}/`)) {
                await supabase.storage
                  .from('food-images')
                  .remove([path]);
              }

              setListings((previous) =>
                previous.filter(
                  (listing) => listing.id !== item.id
                )
              );

              Alert.alert('Listing deleted');
              setCurrentScreen('my-listings');
            } catch (error) {
              Alert.alert(
                'Delete failed',
                errorMessage(error)
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  }

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
        : await supabase.auth.signInWithPassword(
            credentials
          );

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
        errorMessage(error)
      );
    } finally {
      setBusy(false);
    }
  }

  async function chooseProfilePicture() {
    if (!userId || !profileReady || busy) return;

    setBusy(true);

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.6,
          base64: true,
        });

      if (result.canceled) return;

      const asset = result.assets[0];

      if (!asset.base64) {
        throw new Error(
          'Could not read the selected image.'
        );
      }

      const bytes = decode(asset.base64);

      if (bytes.byteLength > 5 * 1024 * 1024) {
        throw new Error(
          'Please choose an image smaller than 5 MB.'
        );
      }

      const path =
        `${userId}/avatar-${Date.now()}.jpg`;

      const { error: uploadError } =
        await supabase.storage
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

      const prefix =
        '/storage/v1/object/public/avatars/';

      const oldPath = avatarUrl.split(prefix)[1];

      if (
        oldPath &&
        oldPath.startsWith(`${userId}/`)
      ) {
        await supabase.storage
          .from('avatars')
          .remove([oldPath]);
      }

      Alert.alert('Profile picture saved');
    } catch (error) {
      Alert.alert(
        'Picture upload failed',
        errorMessage(error)
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
      Alert.alert('Save failed', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setListings([]);
      setMealBase64('');
      setMealImage('');
      setPassword('');
      setCurrentScreen('home');
    } catch (error) {
      Alert.alert('Logout failed', errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.homeContent}>
          <ActivityIndicator
            size="large"
            color="#2D4934"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (
    currentScreen === 'login' ||
    currentScreen === 'signup' ||
    (!session &&
      (
        currentScreen === 'profile' ||
        currentScreen === 'edit-profile' ||
        currentScreen === 'meals' ||
        currentScreen === 'my-listings' ||
        currentScreen === 'listing-form' ||
        currentScreen.startsWith('meal-')
      ))
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
            disabled={busy}
            onPress={() => setCurrentScreen('home')}
          >
            <Text style={styles.backButtonText}>
              Back to Home
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {signUp ? 'Create Account' : 'Log In'}
          </Text>

          <Text style={styles.subtitle}>
            Welcome to Home-Cooked Marketplace
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
              setCurrentScreen(
                signUp ? 'login' : 'signup'
              )
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
                    {(
                      fullName.trim() ||
                      session?.user.email ||
                      'U'
                    )
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
                disabled={busy}
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
                  {busy
                    ? 'Please wait...'
                    : 'Save Profile'}
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

              {isCook && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() =>
                    setCurrentScreen('my-listings')
                  }
                >
                  <Text
                    style={styles.secondaryButtonText}
                  >
                    My Listings
                  </Text>
                </TouchableOpacity>
              )}
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

  if (currentScreen === 'listing-form') {
    if (!profileReady || !isCook) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.homeContent}>
            <Text style={styles.title}>
              Home Cook Account Required
            </Text>

            <Text style={styles.subtitle}>
              Enable the home cook option in your
              profile before creating a listing.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                setCurrentScreen('edit-profile')
              }
            >
              <Text style={styles.buttonText}>
                Edit Profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                setCurrentScreen('home')
              }
            >
              <Text style={styles.secondaryButtonText}>
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

        <ScrollView
          contentContainerStyle={styles.detailsContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            disabled={busy}
            onPress={() =>
              setCurrentScreen('my-listings')
            }
          >
            <Text style={styles.backButtonText}>
              Back to My Listings
            </Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {editingId
              ? 'Edit Food Listing'
              : 'Create Food Listing'}
          </Text>

          <Text style={styles.subtitle}>
            Share your delicious homemade meals
            with your community.
          </Text>

          <View style={styles.card}>
            {mealImage ? (
              <Image
                source={{ uri: mealImage }}
                style={styles.foodImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderEmoji}>
                  🍽️
                </Text>

                <Text style={styles.noticeText}>
                  Add a photo of your meal
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.secondaryButton}
              disabled={busy}
              onPress={chooseMealImage}
            >
              <Text style={styles.secondaryButtonText}>
                {mealImage
                  ? 'Change Food Picture'
                  : 'Add Food Picture'}
              </Text>
            </TouchableOpacity>

            <Text
              style={[
                styles.detailLabel,
                { marginTop: 24 },
              ]}
            >
              Meal Name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Homemade Chicken and Rice"
              value={mealTitle}
              onChangeText={setMealTitle}
              editable={!busy}
            />

            <Text style={styles.detailLabel}>
              Description
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
              ]}
              placeholder="Describe your homemade meal..."
              value={mealDescription}
              onChangeText={setMealDescription}
              multiline
              editable={!busy}
            />

            <Text style={styles.detailLabel}>
              Price per Portion ($)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="12.99"
              value={mealPrice}
              onChangeText={setMealPrice}
              keyboardType="decimal-pad"
              editable={!busy}
            />

            <Text style={styles.detailLabel}>
              Available Portions
            </Text>

            <TextInput
              style={styles.input}
              placeholder="5"
              value={mealPortions}
              onChangeText={setMealPortions}
              keyboardType="number-pad"
              editable={!busy}
            />

            <Text style={styles.detailLabel}>
              Location
            </Text>

            <TextInput
              style={styles.input}
              placeholder="City"
              value={mealLocation}
              onChangeText={setMealLocation}
              editable={!busy}
            />

            <View style={styles.switchRow}>
              <Text style={styles.detailLabel}>
                Available for Customers
              </Text>

              <Switch
                value={available}
                onValueChange={setAvailable}
                disabled={busy}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                { marginTop: 20 },
              ]}
              disabled={busy}
              onPress={saveListing}
            >
              <Text style={styles.buttonText}>
                {busy
                  ? 'Saving...'
                  : editingId
                  ? 'Save Changes'
                  : 'Publish Listing'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (
    currentScreen === 'meals' ||
    currentScreen === 'my-listings'
  ) {
    const own = currentScreen === 'my-listings';

    const visible = listings.filter((item) =>
      own
        ? item.cook_id === userId
        : item.is_available && item.portions > 0
    );

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView
          contentContainerStyle={styles.mealsContent}
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
            {own
              ? 'My Listings'
              : 'Explore Homemade Meals'}
          </Text>

          <Text style={styles.subtitle}>
            {own
              ? 'Create and manage your homemade food listings.'
              : 'Discover delicious meals prepared by home cooks in your community.'}
          </Text>

          {own && isCook && profileReady && (
            <TouchableOpacity
              style={styles.button}
              disabled={busy}
              onPress={() => openListingForm()}
            >
              <Text style={styles.buttonText}>
                + Create Food Listing
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.backButton}
            disabled={loadingListings || busy}
            onPress={loadListings}
          >
            <Text style={styles.backButtonText}>
              Refresh Listings
            </Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>
            {own ? 'Your Meals' : 'Available Meals'}
          </Text>

          {loadingListings ? (
            <ActivityIndicator
              size="large"
              color="#2D4934"
            />
          ) : listingError ? (
            <Text style={styles.noticeText}>
              {listingError}
            </Text>
          ) : visible.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                No Meals Yet
              </Text>

              <Text style={styles.cardText}>
                {own
                  ? 'Create your first food listing to get started.'
                  : 'Check back soon for delicious homemade meals.'}
              </Text>
            </View>
          ) : (
            visible.map((item) => (
              <View
                key={item.id}
                style={styles.mealCard}
              >
                {item.image_url ? (
                  <Image
                    source={{
                      uri: item.image_url,
                    }}
                    style={styles.foodImage}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text
                      style={styles.placeholderEmoji}
                    >
                      🍽️
                    </Text>
                  </View>
                )}

                <View style={styles.mealHeader}>
                  <Text style={styles.mealName}>
                    {item.title}
                  </Text>

                  <Text style={styles.mealPrice}>
                    ${Number(item.price).toFixed(2)}
                  </Text>
                </View>

                <Text style={styles.mealCategory}>
                  {item.location}
                </Text>

                <Text style={styles.mealDescription}>
                  {item.description}
                </Text>

                <Text style={styles.mealCook}>
                  {item.portions} portions available
                </Text>

                {own && (
                  <Text
                    style={[
                      styles.availabilityText,
                      {
                        color:
                          item.is_available &&
                          item.portions > 0
                            ? '#2D4934'
                            : '#B45309',
                      },
                    ]}
                  >
                    {item.is_available &&
                    item.portions > 0
                      ? 'Available'
                      : 'Unavailable'}
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.viewButton}
                  disabled={busy}
                  onPress={() => {
                    setDetailsBack(currentScreen);
                    setCurrentScreen(
                      `meal-${item.id}`
                    );
                  }}
                >
                  <Text style={styles.viewButtonText}>
                    View Details
                  </Text>
                </TouchableOpacity>

                {own && (
                  <View style={styles.managementButtons}>
                    {isCook && (
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        disabled={busy}
                        onPress={() =>
                          openListingForm(item)
                        }
                      >
                        <Text
                          style={
                            styles.secondaryButtonText
                          }
                        >
                          Edit Listing
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.deleteButton}
                      disabled={busy}
                      onPress={() =>
                        deleteListing(item)
                      }
                    >
                      <Text
                        style={styles.deleteButtonText}
                      >
                        Delete Listing
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (currentScreen.startsWith('meal-')) {
    const mealId = currentScreen.slice(5);

    const selectedMeal = listings.find(
      (item) => item.id === mealId
    );

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView
          contentContainerStyle={styles.detailsContent}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              setCurrentScreen(detailsBack)
            }
          >
            <Text style={styles.backButtonText}>
              {detailsBack === 'my-listings'
                ? 'Back to My Listings'
                : 'Back to Meals'}
            </Text>
          </TouchableOpacity>

          {selectedMeal ? (
            <>
              <Text style={styles.title}>
                {selectedMeal.title}
              </Text>

              {selectedMeal.image_url ? (
                <Image
                  source={{
                    uri: selectedMeal.image_url,
                  }}
                  style={styles.detailsFoodImage}
                />
              ) : null}

              <View style={styles.card}>
                <Text style={styles.detailLabel}>
                  Price per Portion
                </Text>

                <Text style={styles.detailValue}>
                  $
                  {Number(
                    selectedMeal.price
                  ).toFixed(2)}
                </Text>

                <Text style={styles.detailLabel}>
                  Description
                </Text>

                <Text style={styles.detailValue}>
                  {selectedMeal.description}
                </Text>

                <Text style={styles.detailLabel}>
                  Available Portions
                </Text>

                <Text style={styles.detailValue}>
                  {selectedMeal.portions}
                </Text>

                <Text style={styles.detailLabel}>
                  Location
                </Text>

                <Text style={styles.detailValue}>
                  {selectedMeal.location}
                </Text>

                <Text style={styles.detailLabel}>
                  Availability
                </Text>

                <Text style={styles.detailValue}>
                  {selectedMeal.is_available &&
                  selectedMeal.portions > 0
                    ? 'Available'
                    : 'Unavailable'}
                </Text>
              </View>

              <Text style={styles.noticeText}>
                Ordering functionality is coming soon.
              </Text>
            </>
          ) : (
            <Text style={styles.noticeText}>
              This listing is unavailable.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
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
              Create your home cook profile, publish
              homemade dishes, upload food pictures,
              and connect with customers.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              setCurrentScreen(
                !session
                  ? 'login'
                  : profileReady && isCook
                  ? 'my-listings'
                  : 'edit-profile'
              )
            }
          >
            <Text style={styles.buttonText}>
              {!session
                ? 'Log In / Create Account'
                : profileReady && isCook
                ? 'My Listings'
                : 'Set Up Cook Profile'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setCurrentScreen('home')}
          >
            <Text style={styles.secondaryButtonText}>
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
            {session && fullName
              ? `Welcome, ${fullName}!`
              : 'Welcome!'}
          </Text>

          <Text style={styles.cardText}>
            Find homemade meals or share your cooking
            with your community.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            setCurrentScreen(
              session ? 'meals' : 'login'
            )
          }
        >
          <Text style={styles.buttonText}>
            Explore Meals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            setCurrentScreen(
              session ? 'profile' : 'login'
            )
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
          onPress={() =>
            setCurrentScreen(
              session && isCook && profileReady
                ? 'my-listings'
                : 'cook'
            )
          }
        >
          <Text style={styles.secondaryButtonText}>
            {session && isCook && profileReady
              ? 'My Listings'
              : 'Become a Home Cook'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    textAlign: 'center',
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
    fontSize: 14,
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
    lineHeight: 22,
  },

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

  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },

  foodImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#E3EAE3',
  },

  detailsFoodImage: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: '#E3EAE3',
  },

  imagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#E3EAE3',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  placeholderEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  availabilityText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  managementButtons: {
    marginTop: 12,
  },

  deleteButton: {
    borderColor: '#B91C1C',
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },

  deleteButtonText: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: 'bold',
  },
});