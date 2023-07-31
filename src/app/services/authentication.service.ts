//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2023  Interneuron Holdings Ltd

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 


import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';


@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  token: string = "empty";
  nextrefresh: number = 0;

  constructor(private httpClient: HttpClient) {
  }

  public async getToken() {

    var currentDate = new Date();
    var currentDateMs = currentDate.setSeconds(currentDate.getSeconds());
    if (this.nextrefresh < currentDateMs) {
      await this.requestToken();
    }
    return this.token;

  }


  public async requestToken() {

    let headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });
    await this.httpClient.post("https://synapseidentityserver.dev.interneuron.io/connect/token", "grant_type=client_credentials&client_id=client&client_secret=secret&scope=dynamicapi.read terminologyapi.read terminologyapi.write",
      { headers: headers })
      .toPromise().then((resp: any) => {

        this.token = resp.access_token;
        let currentDateTime = new Date();
        this.nextrefresh = currentDateTime.setSeconds(currentDateTime.getSeconds() + parseInt(resp.expires_in) - 120)

      }
      )
      .catch((result) => {
        throw result;

      });

  }






}
