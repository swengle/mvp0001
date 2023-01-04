import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import SigninScreen from "./auth/SigninScreen";
import SelectCountryScreen from "./auth/SelectCountryScreen";
import EnterCodeScreen from "./auth/EnterCodeScreen";

const Stack = createStackNavigator();

const AuthStack = function() {
  return (
    <Stack.Navigator>
      <Stack.Group>
        <Stack.Screen name="SigninScreen" component={SigninScreen} options={{headerShown: false}}/>
        <Stack.Screen name="EnterCodeScreen" component={EnterCodeScreen} options={{headerShown: false}}/>
        <Stack.Screen name="SelectCountryScreen" component={SelectCountryScreen} options={{headerShown: false, ...TransitionPresets.ScaleFromCenterAndroid}}/>
      </Stack.Group>
    </Stack.Navigator>
  );
};

export default AuthStack;
