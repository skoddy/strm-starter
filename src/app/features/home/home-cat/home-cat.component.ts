import { Component, OnInit, OnDestroy, HostListener, Input, OnChanges } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import {
  animate,
  query,
  style,
  transition,
  trigger,
  stagger,
  keyframes
} from '@angular/animations';
import { tap } from 'rxjs/operators';
import { interval } from 'rxjs/observable/interval';
import { AngularFirestoreCollection, AngularFirestore } from 'angularfire2/firestore';
import { AuthService, DatabaseService } from '@app/core';
import * as faker from 'faker';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/combineLatest';
import * as firebase from 'firebase/app';
import { Route, ActivatedRoute, Router, NavigationEnd, NavigationStart } from '@angular/router';
export interface Post {
  uid: string;
  createdAt: string;
  content: string;
  category: string;
  author: {
    displayName: string;
    photoURL: string;
  };
}
export interface NewPost {
  uid: string;
  displayName: string;
  photoURL: string;
  content: string;
  category: string;
}
export interface QueryConfig {
  path: string;
  field: string;
  limitFirst: number;
  limitMore: number;
  reverse: boolean;
  prepend: boolean;
  direction: string;
  cat: string;
}

@Component({
  selector: 'app-home-cat',
  templateUrl: './home-cat.component.html',
  styleUrls: ['./home-cat.component.scss'],
  animations: [
    trigger('slidein', [
      transition('*=>*', [
        query(':enter', style({ opacity: 0 }), { optional: true }),
        query(':enter', stagger('100ms', [
          animate('.4s ease-in-out', keyframes([
            style({ opacity: 0, offset: 0 }),
            style({ opacity: 1, offset: 1 }),
          ]))]), { optional: true })
        ,
      ])
    ])
  ]
})
export class HomeCatComponent implements OnInit {
  @Input() cat: string;
  selectedCat: string;
  mouseOverTimer: any;
  docs = 8;
  datalength: number;
  feed$: Observable<Post[]>;
  content: string;
  category: string;
  private query: QueryConfig;
  // Source data
  private _done = new BehaviorSubject(false);
  private _loading = new BehaviorSubject(false);
  private _data = new BehaviorSubject([]);
  // Observable data
  data: Observable<any>;
  done: Observable<boolean> = this._done.asObservable();
  loading: Observable<boolean> = this._loading.asObservable();
  constructor(private afs: AngularFirestore,
    private db: DatabaseService,
    private auth: AuthService,
    private route: ActivatedRoute,
    private router: Router) {


  }

  ngOnInit() {
    const cats = ['Programmierung', 'Netzwerke', 'Prüfung', 'Sonstiges'];
    let id = +this.route.snapshot.paramMap.get('id');
    this.init(`hackers`, 'createdAt', cats[+id - 1]);
    this.router.events.filter(event => event instanceof NavigationEnd)
      .subscribe((event: NavigationEnd) => {
        id = +this.route.snapshot.paramMap.get('id');
        this.init(`hackers`, 'createdAt', cats[+id - 1]);

        console.log(id);
      });
    window.addEventListener('scroll', this.scroll, true); // third parameter

  }

  // tslint:disable-next-line:use-life-cycle-interface
  ngOnDestroy() {
    // this._data.unsubscribe();
    window.removeEventListener('scroll', this.scroll, true);
    console.log('bye');
  }
  // tslint:disable-next-line:use-life-cycle-interface
  ngOnChanges() {
    console.log('change');
  }
  scroll = (e): void => {
    const top = e.target.scrollTop;
    const height = e.target.scrollHeight;
    const offset = e.target.clientHeight;
    if (top > height - offset - 150) {
      console.log('bottom');
      this.more();
    }
    if (top === 0) {

    }
  }

  init(path: string, field: string, cat: string, opts?: any) {
    console.log(this.data);
    console.log(this._data);
    if (this.data) {
      this._data = new BehaviorSubject([]);
      console.log('hi');
      console.log(this._data);
    }
    this.query = {
      path,
      field,
      limitFirst: 8,
      limitMore: 4,
      reverse: true,
      prepend: false,
      cat,
      ...opts
    };

    const first = this.afs.collection(this.query.path, ref => {
      return ref
        .where('cat', '==', this.query.cat)
        .orderBy(this.query.field, 'desc')
        .limit(this.query.limitFirst);
    });
    this.mapAndUpdate(first);

    // Create the observable array for consumption in components
    this.data = this._data.asObservable()
      .scan((acc, val) => {
        return this.query.prepend ? val.concat(acc) : acc.concat(val);
      });

  }
  // Retrieves additional data from firestore
  more() {
    const cursor = this.getCursor();
    const more = this.afs.collection(this.query.path, ref => {
      return ref
        .where('cat', '==', this.query.cat)
        .orderBy(this.query.field, 'desc')
        .limit(this.query.limitMore)
        .startAfter(cursor);
    });
    this.docs += this.query.limitMore;
    this.mapAndUpdate(more);
  }

  // Determines the doc snapshot to paginate query
  private getCursor() {
    const current = this._data.value;
    if (current.length) {
      return this.query.prepend ? current[0].doc : current[current.length - 1].doc;
    }
    return null;
  }

  // Maps the snapshot to usable format the updates source
  private mapAndUpdate(col?: AngularFirestoreCollection<any>) {
    if (this._done.value || this._loading.value) { return; }
    // loading
    this._loading.next(true);
    // Map snapshot with doc ref (needed for cursor)
    return col.snapshotChanges().pipe(
      tap(docs => {
        this.docs++;
        console.log(this.docs);
      }),
      tap(arr => {
        let values = arr.map(snap => {
          const data = snap.payload.doc.data();
          const doc = snap.payload.doc;
          const id = snap.payload.doc.id;
          return { id, ...data, doc };
        });
        // If prepending, reverse the batch order
        values = this.query.prepend ? values.reverse() : values;

        // update source with new values, done loading
        this._data.next(values);
        this._loading.next(false);
        // no more values, mark done
        if (!values.length) {
          this._done.next(true);
        }
        this._loading.next(false);
      }),
    ).take(1).subscribe();
  }

  myScrollHandler(e) {
    const top = e.target.documentElement.scrollTop;
    const height = e.target.documentElement.scrollHeight;
    const offset = e.target.documentElement.clientHeight;
    console.log('bottom');
    if (top > height - offset - 1) {
      // this.more();
      console.log('bottom');
    }
    if (top === 0) {
      console.log('top');
    }
  }
  public createPost(category: string, content: string) {
    this.db.add<NewPost>(`users/${this.auth.uid}/posts`, {
      uid: this.auth.uid,
      displayName: this.auth.displayName,
      photoURL: this.auth.photoURL,
      content: content,
      category: category
    });
    this.content = undefined;
    this.category = undefined;
  }
  addone() {
    const categories = [
      'Programmierung',
      'Netzwerke',
      'Prüfung',
      'Sonstiges'
    ];

    const hacker = {
      displayName: faker.name.findName(),
      age: faker.random.number({ min: 18, max: 99 }),
      email: faker.internet.email(),
      content: faker.lorem.sentences(4),
      uid: faker.random.alphaNumeric(16),
      photoURL: faker.internet.avatar(),
      cat: this.getRandomItem(categories),
      createdAt: new Date()
    };
    this.afs.collection('hackers').doc(hacker.uid).set(hacker);
  }

  getRandomItem(arr) {
    console.log(arr);
    return arr[Math.floor(Math.random() * arr.length)];
  }
  sortByCat(cat: string) {
    // this._data.unsubscribe();
    // this.init(`hackers`, 'cat');this._data.next(values);
    this.data = this.data.map((users) => {
      console.log(users);

      users = users.filter(user => {
        // console.log(user);
        return user.cat === cat;
      });
      return users;
    });
    this.more();
  }
  onHovering(e) {
    const source = interval(500).take(1);
    this.mouseOverTimer = source.subscribe(val => {
      e.target.classList.remove('mat-elevation-z2');
      e.target.className = e.target.className.concat(' mat-elevation-z8 ');
    });
  }
  onUnovering(e) {
    this.mouseOverTimer.unsubscribe();
    e.target.classList.remove('mat-elevation-z8');
    e.target.className = e.target.className.concat(' mat-elevation-z2 ');
  }
}