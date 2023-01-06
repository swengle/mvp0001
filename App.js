import $ from "./setup";
import _ from "underscore";
import { useEffect, useState } from "react";
import { LogBox, useColorScheme, useWindowDimensions } from 'react-native';
import Toast, { ToastProvider } from 'react-native-toast-notifications';
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { adaptNavigationTheme, Button, Dialog, Paragraph, Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subscribe, useSnapshot } from 'valtio';
import AuthStack from "./screens/AuthStack";
import MainStack from "./screens/MainStack";
import * as Font from 'expo-font';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { StatusBar } from 'expo-status-bar';
import messaging from '@react-native-firebase/messaging';
import { Asset } from 'expo-asset';
import useCachedData from "./hooks/useCachedData";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

SplashScreen.preventAutoHideAsync();

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  light: NavigationDefaultTheme,
  dark: NavigationDarkTheme,
});

const CombinedDefaultTheme = {
  ...MD3LightTheme,
  ...LightTheme,
  colors: { 
    ...MD3LightTheme.colors,
    ...LightTheme.colors,
  },
};
const CombinedDarkTheme = {
  ...MD3DarkTheme,
  ...DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...DarkTheme.colors,
  },
};


export default function App() {
  LogBox.ignoreLogs(["AsyncStorage has been extracted from react-native core and will be removed in a future release. It can now be installed and imported from '@react-native-async-storage/async-storage' instead of 'react-native'. See https://github.com/react-native-async-storage/async-storage",
                      "VirtualizedLists should never be nested inside plain ScrollViews with the same orientation because it can break windowing and other functionality - use another VirtualizedList-backed container instead."]);
                      
  
  const [is_camera_permission_visible, set_is_camera_permission_visible] = useState();
  const [is_photos_permission_visible, set_is_photos_permission_visible] = useState();
  const [is_contacts_permission_visible, set_is_contacts_permission_visible ] = useState();
  const [is_prep_ready, set_is_prep_ready] = useState();
  const [is_auth_ready, set_is_auth_ready] = useState();
  const [is_splash_hidden, set_is_splash_hidden] = useState();
  

  const { width } = useWindowDimensions();

  $.const = {
    width: width,
    image_sizes: {
      "1" : {
        width: width,
        height: width * (1350/1080)
      },
      "2" : {
        width: width/2,
        height: (width/2)  * (1350/1080)
      },
      "3" : {
        width: width/3,
        height: (width/3) * (1350/1080)
      },
      "4" : {
        width: width/4,
        height: (width/4) * (1350/1080)
      }
    },
    emoji_groups: {
      smileys: {name: "Smileys & Emotion", icon: "emoticon"},
      people: {name: "People & Body", icon: "account-multiple"},
      animals: {name: "Animals & Nature", icon: "dog"},
      food: {name: "Food & Drink", icon: "food-apple"},
      travel: {name: "Travel & Places", icon: "car"},
      activities: {name: "Activities", icon: "basketball"},
      objects: {name: "Objects", icon: "tshirt-crew"},
      symbols: {name: "Symbols", icon: "symbol"},
      flags: {name: "Flags", icon: "flag"}
    }
  };
  
  const snap_app = useSnapshot($.app);
  const snap_session = useSnapshot($.session);
  const scheme = useColorScheme();
  const subscriptions = {};

  const turn_off_subscriptions = function() {
    _.each(subscriptions, function(end_subscription) {
      end_subscription();
    });
  };
  
  useEffect(() => {
    if (!is_splash_hidden && is_auth_ready && is_prep_ready) {
      set_is_splash_hidden(true);
      _.delay(async function() {
        await SplashScreen.hideAsync();
      }, 1);
    }
  }, [is_prep_ready, is_auth_ready, is_splash_hidden]);
  
  useEffect(() => {
    async function prepare() {
      try {
        
        $.show_camera_permissions_dialog = function() {
          set_is_camera_permission_visible(true);
        };
        
        $.show_photopicker_permissions_dialog = function() {
          set_is_photos_permission_visible(true);
        };
        
        $.show_contacts_permissions_dialog = function() {
          set_is_contacts_permission_visible(true);
        };
        
        // save any changes to $.app in storage
        // if this fails the user has bigger problems than us
        subscribe($.app, function() {
          AsyncStorage.setItem("@state", JSON.stringify($.app));
        });
        
        const auth = getAuth();
        onAuthStateChanged(auth, async function(u) {
          if (u) {
            //await signOut(auth);
            try {
              const id_token_result = await auth.currentUser.getIdTokenResult();
              $.session.stream_token = id_token_result.claims.stream_token;
              
              // update the current user when they are updated in any way
              subscriptions.fs_current_user = onSnapshot(doc($.db, "users", u.uid), (doc) => {
                const current_user = doc.data();
                if (current_user.current_post && current_user.current_post.is_owner_liked) {
                  current_user.current_post.is_liked = true;
                }
                useCachedData.cache_set(current_user);
                $.session.uid = u.uid;
              });

              /*
              const ref_user_counts = doc($.db, "users/" + u.uid + "/counts", "emojis");
              const user_counts_doc_snap = await getDoc(ref_user_counts);
              if (user_counts_doc_snap.exists()) {
                $.session.user_counts = user_counts_doc_snap.data();
              }
              */

              $.session.global_counts = (await $.cf.get_global_counts()).data;
              
              
            } catch(e) {
              $.logger.error(e);
            }
          }
          set_is_auth_ready(true);
        });

      
        subscriptions.messaging = messaging().onMessage(async remoteMessage=>{
          console.log("unsubscribe_messaging", JSON.stringify(remoteMessage));
        });
        
        subscriptions.background_messaging + messaging().setBackgroundMessageHandler(async remoteMessage => {
          console.log('unsubscribe_background_messaging', remoteMessage);
        });


        await Asset.loadAsync(require('./assets/dark-puzzled-500.png'));
        await Asset.loadAsync(require('./assets/light-puzzled-500.png'));
        
        await Font.loadAsync({"TwemojiMozilla": require("./assets/TwemojiMozilla.ttf")});

        const stored_snap_app = await AsyncStorage.getItem("@state");
        if (stored_snap_app) {
          const json = JSON.parse(stored_snap_app);
          for(let key in $.app){
            if(!(key in json)) {
              delete $.app[key];
            }
          }
          _.extend($.app, json);
        }
      } catch (e) {
        $.logger.error(e);
      } finally {
        set_is_prep_ready(true);
      }
    }

    prepare();
    
    return turn_off_subscriptions;
  }, []);
  
  if (!is_prep_ready || !is_auth_ready) {
    return null;
  }
  
  const on_press_open_settings = function() {
    set_is_camera_permission_visible(false);
    $.openAppSettings();
  };
  
  const on_press_cancel = function() {
    set_is_camera_permission_visible(false);
    set_is_photos_permission_visible(false);
  };
  
  return (
    <ToastProvider duration={2000}>
      <PaperProvider theme={(scheme === "dark" || snap_app.scheme === "dark") ? CombinedDarkTheme : CombinedDefaultTheme}>
        <NavigationContainer theme={(scheme === "dark" || snap_app.scheme === "dark") ? CombinedDarkTheme : CombinedDefaultTheme}>
          {!snap_session.uid && (
            <AuthStack/>
          )}
          {snap_session.uid && (
            <MainStack/>
          )}
        </NavigationContainer>
        <Toast ref={(ref) => global['toast'] = ref} />
        
        <Dialog visible={is_camera_permission_visible} dismissable={false}>
            <Dialog.Content>
              <Paragraph>Please enable permission to use the camera.</Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={on_press_cancel}>Cancel</Button>
              <Button onPress={on_press_open_settings}>Open Settings</Button>
            </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={is_photos_permission_visible} dismissable={false}>
            <Dialog.Content>
              <Paragraph>Please enable permission to access photos.</Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={on_press_cancel}>Cancel</Button>
              <Button onPress={on_press_open_settings}>Open Settings</Button>
            </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={is_contacts_permission_visible} dismissable={false}>
            <Dialog.Content>
              <Paragraph>Please enable permission to access contacts.</Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={on_press_cancel}>Cancel</Button>
              <Button onPress={on_press_open_settings}>Open Settings</Button>
            </Dialog.Actions>
        </Dialog>
        <StatusBar style={(scheme === "dark" || snap_app.scheme === "dark") ? "light" : "dark"} />
      </PaperProvider>
    </ToastProvider>
  );
}
