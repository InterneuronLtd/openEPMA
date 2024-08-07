//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Limited

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
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { AppService } from './app.service';

@Injectable()
export class UpsertTransactionManager {
    entities: UpsertEntity[] = new Array<UpsertEntity>();
    baseApiUrl: string;
    apiServiceObj: any;
    destroy$ = new Subject<boolean>();
    savedDetails: UpsertEntity[] = null;

    beginTran(baseApiUrl: string, apiServiceObj: any) {
        this.entities = new Array<UpsertEntity>();
        this.savedDetails = null;
        this.baseApiUrl = baseApiUrl;
        this.apiServiceObj = apiServiceObj;
    }

    addEntity(synapseNamespace: string, entityName: string, data: any, dbOp?: dbOp): void {

        if (synapseNamespace && entityName && data) {

            //cloning the object - let original remain intact
            let dataToSave: any = JSON.parse(JSON.stringify(data));

            dbOp = dbOp ? dbOp : 'ins';

            let entity = new UpsertEntity();
            entity[`${synapseNamespace}|${entityName}:${dbOp}`] = dataToSave;
            this.entities.push(entity);
        }
    }

    //Note: Once the save function is called, all the added entities will be removed from list
    save(onSuccess?: (savedDetails: any) => void, onError?: (err: any) => void, synchronousPost = true) {

        if (this.entities == null || !Array.isArray(this.entities) || this.entities.length == 0) {
            if (onError)
                onError("No Entities to save");
            return;
        }
        const url = `${this.baseApiUrl}/PostObjectsInTransaction`;

        console.log(JSON.stringify(this.entities));

        this.apiServiceObj.postRequest(url, this.entities, synchronousPost)
            .pipe(takeUntil(this.destroy$))
            .subscribe((newEntityDetails: any) => {
                console.log('Saved Details');
                console.log(newEntityDetails);

                this.entities = null;

                this.savedDetails = newEntityDetails.data ? newEntityDetails.data : newEntityDetails;
                if (onSuccess)
                    onSuccess(newEntityDetails);

            },
                (err) => {
                    console.log('Error Details');
                    console.log(err);

                    this.entities = null;
                    this.savedDetails = null;

                    if (onError)
                        onError(err);
                });
    }

    getSavedEntity(synapseNamespace?: string, entityName?: string, filter?: (item: any) => boolean): any {

        if (!this.savedDetails) return null;

        var entityToFind = this.savedDetails[`${synapseNamespace}|${entityName}`];//this.savedDetails.find(sd=> sd.key == `${synapseNamespace}|${entityName}`);

        if (!entityToFind) return null;

        if (filter && Array.isArray(entityToFind)) {
            return entityToFind.filter(e => filter(e));
        }

        return entityToFind;
    }

    destroy() {
        if (this.destroy$) {
            this.destroy$.next(true);
            this.destroy$.complete();
        }

    }
}

export class UpsertEntity {
    [key: string]: any;
}

export type dbOp = 'ins' | 'del';