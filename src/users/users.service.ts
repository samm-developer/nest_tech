import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  name: string;
}

@Injectable()
export class UsersService {
  private readonly users: User[] = [
    { id: 1, name: 'Adesh' },
    { id: 2, name: 'Rahul' },
  ];

  findAll(): User[] {
    return this.users;
  }
}
