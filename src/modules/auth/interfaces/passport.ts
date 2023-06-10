export interface PassportUser {
  id: string;
}

export interface PassportDevice {
  agent: string;
}

export interface Passport {
  iss: string;
  aud: string;
  sub: string;
  iat: number;
  exp: number;
  usr: PassportUser;
  dev: PassportDevice;
}
