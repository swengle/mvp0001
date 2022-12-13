import $ from "./setup";
import _ from "underscore";
import { useEffect } from "react";
import { AppState, LogBox, useColorScheme } from 'react-native';
import Toast, { ToastProvider } from 'react-native-toast-notifications';
import { NavigationContainer, DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { adaptNavigationTheme, Button, Dialog, Paragraph, Provider as PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { proxy, subscribe, useSnapshot } from 'valtio';
import AuthStack from "./screens/AuthStack";
import MainStack from "./screens/MainStack";
import * as Font from 'expo-font';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { StatusBar } from 'expo-status-bar';
import messaging from '@react-native-firebase/messaging';
import { Asset } from 'expo-asset';
import firestore from "./firestore/firestore";

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

const auth = getAuth();
SplashScreen.preventAutoHideAsync();

export default function App() {
  LogBox.ignoreLogs(["AsyncStorage has been extracted from react-native core and will be removed in a future release. It can now be installed and imported from '@react-native-async-storage/async-storage' instead of 'react-native'. See https://github.com/react-native-async-storage/async-storage"]);
  if (!$.session) {
    $.session = proxy({});
  }
  if (!$.dialog) {
    $.dialog = proxy({});
  }
  const snap_app = useSnapshot($.app);
  const snap_session = useSnapshot($.session);
  const snap_dialog = useSnapshot($.dialog);
  const scheme = useColorScheme();
  let unsubscribe_app, unsubscribe_auth_state, unsubscribe_session, unsubscribe_messaging, unsubscribe_background_messaging, unsubscribe_app_state;
 
  useEffect(() => {
    async function prepare() {
      try {
        unsubscribe_app = subscribe($.app, function() {
          AsyncStorage.setItem("@state", JSON.stringify($.app));
        });
        
        unsubscribe_auth_state = onAuthStateChanged(auth, async function(u) {
          if (u) {
            try {
              const user_ids = await firestore.load_users({ids: [u.uid]});
              if (_.size(user_ids) === 1) {
                $.session.uid = u.uid;
              } else {
                await signOut(auth);
              }
            } catch(e) {
              console.log(e);
            }
          } else {
            delete $.session.uid;
          }
          $.session.is_auth_ready = true;
        });
        
        unsubscribe_session = subscribe($.session, async function() {
          if (!$.session.is_splash_hidden && $.session.is_auth_ready && $.session.is_prep_ready) {
            $.session.is_splash_hidden = true;
            _.delay(async function() {
              await SplashScreen.hideAsync();
            }, 100);
          }
        });
        
        unsubscribe_messaging = messaging().onMessage(async remoteMessage=>{
          console.log("unsubscribe_messaging", JSON.stringify(remoteMessage));
        });
        
        unsubscribe_background_messaging + messaging().setBackgroundMessageHandler(async remoteMessage => {
          console.log('unsubscribe_background_messaging', remoteMessage);
        });
        
        unsubscribe_app_state = AppState.addEventListener("change", function(next_app_state) {
          if ($.session.uid && next_app_state === "active") {
            $.check_notification_permissions();
          }
        });

        await Asset.loadAsync(require('./assets/dark-puzzled-500.png'));
        await Asset.loadAsync(require('./assets/light-puzzled-500.png'));
        
        await Font.loadAsync({
          "TwemojiMozilla": require("./assets/TwemojiMozilla.ttf")
        });

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
        console.warn(e);
      } finally {
        $.session.is_prep_ready = true;
      }
    }

    prepare();
    
    return function() {
      unsubscribe_app && unsubscribe_app();
      unsubscribe_auth_state && unsubscribe_auth_state();
      unsubscribe_session && unsubscribe_session();
      unsubscribe_messaging && unsubscribe_messaging();
      unsubscribe_background_messaging && unsubscribe_background_messaging();
      unsubscribe_app_state && unsubscribe_app_state.remove();
    };
  }, []);
  
  
  if (!$.session.is_prep_ready || !$.session.is_auth_ready) {
    return null;
  }
  
  const on_press_open_settings = function() {
    $.dialog.is_camera_permission_visible = false;
    $.openAppSettings();
  };
  
  const on_press_cancel = function() {
    $.dialog.is_camera_permission_visible = false;
    $.dialog.is_photos_permission_visible = false;
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
        
        <Dialog visible={snap_dialog.is_camera_permission_visible} dismissable={false}>
            <Dialog.Content>
              <Paragraph>Please enable permission to use the camera.</Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={on_press_cancel}>Cancel</Button>
              <Button onPress={on_press_open_settings}>Open Settings</Button>
            </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={snap_dialog.is_photos_permission_visible} dismissable={false}>
            <Dialog.Content>
              <Paragraph>Please enable permission to access photos.</Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={on_press_cancel}>Cancel</Button>
              <Button onPress={on_press_open_settings}>Open Settings</Button>
            </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={snap_dialog.is_contacts_permission_visible} dismissable={false}>
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
