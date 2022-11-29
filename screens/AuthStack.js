import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SigninScreen from "./auth/Signin";
import SelectCountryScreen from "./auth/SelectCountry";
import EnterCodeScreen from "./auth/EnterCode";

const Stack = createNativeStackNavigator();

const AuthStack = function() {
  return (
    <Stack.Navigator>
      <Stack.Group>
        <Stack.Screen name="SigninScreen" component={SigninScreen} options={{headerShown: false}}/>
        <Stack.Screen name="EnterCodeScreen" component={EnterCodeScreen} options={{headerShown: false}}/>
      </Stack.Group>
      <Stack.Group screenOptions={{ presentation: "modal" }}>
        <Stack.Screen name="SelectCountryScreen" component={SelectCountryScreen} options={{headerShown: false}}/>
      </Stack.Group>
    </Stack.Navigator>
  );
};

export default AuthStack;
