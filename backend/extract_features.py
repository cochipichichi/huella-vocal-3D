
import argparse, json, numpy as np, librosa, umap
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('audio'); ap.add_argument('--out', default='embedding.json')
    ap.add_argument('--sr', type=int, default=22050); ap.add_argument('--n_fft', type=int, default=1024); ap.add_argument('--hop', type=int, default=256)
    a=ap.parse_args()
    y,sr=librosa.load(a.audio, sr=a.sr, mono=True)
    S=np.abs(librosa.stft(y, n_fft=a.n_fft, hop_length=a.hop))
    power=S**2
    centroid=librosa.feature.spectral_centroid(S=S, sr=sr)[0]
    amp=librosa.feature.rms(S=S)[0]
    fdom=(np.argmax(S, axis=0)*sr/a.n_fft)
    MFCC=librosa.feature.mfcc(S=librosa.power_to_db(power), sr=sr, n_mfcc=20).T
    emb=umap.UMAP(n_components=3, n_neighbors=30, min_dist=0.1, random_state=42).fit_transform(MFCC)
    hop_t=a.hop/sr
    data=[{"t":round(i*hop_t,4),"x":float(emb[i,0]),"y":float(emb[i,1]),"z":float(emb[i,2]),
           "centroid":float(centroid[min(i,len(centroid)-1)]),"amp":float(amp[min(i,len(amp)-1)]),"rms":float(amp[min(i,len(amp)-1)]),"f0approx":float(fdom[min(i,len(fdom)-1)])}
           for i in range(emb.shape[0])]
    with open(a.out,'w') as f: json.dump(data,f)
    print('Wrote',a.out,'frames',len(data))
if __name__=='__main__': main()
