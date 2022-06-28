//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2022  Interneuron CIC

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



export class WarningService {
    public encouterId: string;
    public personId: string;
    public newWarningsStatus: boolean;
    public existingWarningsStatus: boolean;
    public showExistingWarnings: boolean;
    public showNewWarnings: boolean;
    public loader: boolean;
    public context: WarningContext;

    resetWarningService() {

    }

    GetExistingWarnings(refreshfromdb: boolean, cb) {
    }
    RefreshCurrentMedicationWarnings(CurrentPrescriptions, patientInfo, cb) {
    }
    UpdateOverrideMsg(comments, cb) {
    }
    GetNewWarnings(ProspectivePrescriptions, CurrentPrescriptions, patientInfo, cb, isEdit = false) {
    }
    CommitNewWarningsToDB(cb) {
    }
    SetExistingWarningStatus() {
    }
    SetNewWarningStatus() {
    }
    ClearNewWarnings() {

    }
}

export class WarningContexts {
    public contexts: WarningService[] = [];
    public encounterId;
    public personId;


    public GetWarningsInstanceWithCreate(context: WarningContext | string) {
    }
    public GetWarningsInstance(context: WarningContext | string): any {

    }
}

export enum WarningContext {
    ["ip"] = "ip",
    ["mod"] = "mod",
    ["op"] = "op"
}
export class PatientInfo {
    public age: number
    public allergens: Allergens[]
    public bsa: number
    public gender: number
    public height: number
    public weight: number
}

export class Allergens {
    public uname: string
    public type: number
    public code: string
}
